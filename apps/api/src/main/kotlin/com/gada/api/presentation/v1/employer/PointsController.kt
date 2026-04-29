package com.gada.api.presentation.v1.employer

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.notification.Notification
import com.gada.api.domain.notification.NotificationType
import com.gada.api.domain.points.ChargeStatus
import com.gada.api.domain.points.PaymentMethod
import com.gada.api.domain.points.PointChargeRequest
import com.gada.api.domain.points.TeamProposal
import com.gada.api.infrastructure.persistence.notification.NotificationRepository
import com.gada.api.infrastructure.persistence.points.PointsRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestTemplate
import java.time.Instant
import java.util.Base64
import kotlin.math.ceil

@Tag(name = "Employer / Points", description = "고용주 포인트 및 팀 제안 관리")
@RestController
@Transactional
@RequestMapping("/api/v1/employer")
@PreAuthorize("hasRole('EMPLOYER')")
class PointsController(
    private val pointsRepository: PointsRepository,
    private val notificationRepository: NotificationRepository,
    private val teamRepository: TeamRepository,
    @Value("\${toss.payments.secret-key}") private val tossSecretKey: String,
) {

    private val restTemplate = RestTemplate()

    companion object {
        private val ALLOWED_AMOUNTS = setOf(300_000, 500_000, 1_000_000, 3_000_000, 5_000_000)
    }

    // ═══════════════════════════════════════════════════════
    // POINTS — BALANCE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "포인트 잔액 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/points")
    fun getPointBalance(
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointBalanceResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val account = pointsRepository.findOrCreateAccount(userId)
        return ApiResponse.ok(
            PointBalanceResponse(
                balance = account.balance,
                totalCharged = account.totalCharged,
                totalUsed = account.totalUsed,
                updatedAt = account.updatedAt,
            )
        ).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // POINTS — CHARGE REQUESTS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "포인트 충전 요청 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/points/charges")
    fun listChargeRequests(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<PointChargeRequestItem>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (requests, total) = pointsRepository.findChargeRequestsByUserId(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val response = PageResponse(
            content = requests.map { it.toItem() },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    @Operation(summary = "포인트 충전 요청", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/points/charges")
    fun requestCharge(
        @Valid @RequestBody req: PointChargeRequestBody,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointChargeRequestItem>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        if (req.amountKrw !in ALLOWED_AMOUNTS) {
            throw BusinessException(
                "허용되지 않는 충전 금액입니다. (30만/50만/100만/300만/500만원)",
                "INVALID_CHARGE_AMOUNT",
            )
        }

        runCatching { PaymentMethod.valueOf(req.paymentMethod) }.getOrElse {
            throw BusinessException("결제 방법은 CASH 또는 CARD 이어야 합니다.", "INVALID_PAYMENT_METHOD")
        }

        // 1만원 = 1 포인트
        val pointsToAdd = req.amountKrw / 10_000

        val chargeRequest = PointChargeRequest().also {
            it.userId = userId
            it.amountKrw = req.amountKrw
            it.pointsToAdd = pointsToAdd
            it.paymentMethod = req.paymentMethod
        }
        val saved = pointsRepository.saveChargeRequest(chargeRequest)
        return ApiResponse.ok(saved.toItem()).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "카드 결제 확인 (토스페이먼츠)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/points/charges/card-confirm")
    fun confirmCardPayment(
        @Valid @RequestBody req: CardPaymentConfirmRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointChargeRequestItem>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        if (req.amountKrw !in ALLOWED_AMOUNTS) {
            throw BusinessException("허용되지 않는 충전 금액입니다.", "INVALID_CHARGE_AMOUNT")
        }

        // 중복 결제 방지
        if (pointsRepository.existsByTossPaymentKey(req.paymentKey)) {
            throw ConflictException("이미 처리된 결제입니다.", "PAYMENT_ALREADY_PROCESSED")
        }

        // 토스페이먼츠 API로 결제 확인
        val credentials = Base64.getEncoder().encodeToString("${tossSecretKey}:".toByteArray())
        val headers = HttpHeaders().apply {
            set("Authorization", "Basic $credentials")
            contentType = MediaType.APPLICATION_JSON
        }
        val body = mapOf("paymentKey" to req.paymentKey, "orderId" to req.orderId, "amount" to req.amountKrw)
        try {
            restTemplate.postForEntity(
                "https://api.tosspayments.com/v1/payments/confirm",
                HttpEntity(body, headers),
                Map::class.java,
            )
        } catch (e: HttpClientErrorException) {
            throw BusinessException("토스페이먼츠 결제 확인에 실패했습니다: ${e.responseBodyAsString}", "PAYMENT_VERIFICATION_FAILED")
        }

        // 충전 요청 생성 (자동 승인)
        val pointsToAdd = req.amountKrw / 10_000
        val chargeRequest = PointChargeRequest().also {
            it.userId = userId
            it.amountKrw = req.amountKrw
            it.pointsToAdd = pointsToAdd
            it.paymentMethod = PaymentMethod.CARD.name
            it.status = ChargeStatus.APPROVED.name
            it.reviewedAt = Instant.now()
            it.tossPaymentKey = req.paymentKey
            it.tossOrderId = req.orderId
        }
        pointsRepository.saveChargeRequest(chargeRequest)

        // 포인트 즉시 지급
        val account = pointsRepository.findOrCreateAccount(userId)
        account.addPoints(pointsToAdd)
        pointsRepository.saveAccount(account)

        return ApiResponse.ok(chargeRequest.toItem()).toResponseEntity(HttpStatus.CREATED)
    }

    // ═══════════════════════════════════════════════════════
    // TEAM PROPOSALS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "내 팀 제안 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/teams/proposals")
    fun listProposals(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<TeamProposalItem>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (proposals, total) = pointsRepository.findProposalsByEmployer(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val response = PageResponse(
            content = proposals.map { it.toItem() },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    @Operation(summary = "팀에 일자리 제안 보내기 (1포인트 차감)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/teams/proposals")
    fun sendProposal(
        @Valid @RequestBody req: SendProposalRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<TeamProposalItem>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        // Duplicate check
        if (pointsRepository.existsProposal(req.teamPublicId, req.jobPublicId, userId)) {
            throw ConflictException("이미 해당 팀에 동일한 공고로 제안을 보냈습니다.", "PROPOSAL_ALREADY_EXISTS")
        }

        // Balance check + atomic deduction
        val account = pointsRepository.findOrCreateAccount(userId)
        if (!account.hasBalance) {
            throw BusinessException("포인트 잔액이 부족합니다. 포인트를 충전해 주세요.", "INSUFFICIENT_POINTS")
        }
        account.deductPoint()
        pointsRepository.saveAccount(account)

        val proposal = TeamProposal().also {
            it.teamPublicId = req.teamPublicId
            it.employerId = userId
            it.jobPublicId = req.jobPublicId
            it.jobTitle = req.jobTitle
            it.message = req.message
        }
        val saved = pointsRepository.saveProposal(proposal)

        // Send SCOUT notification to team leader
        runCatching {
            val team = teamRepository.findByPublicId(java.util.UUID.fromString(req.teamPublicId))
            if (team != null) {
                val notif = Notification().apply {
                    this.userId = team.leaderId
                    this.type = NotificationType.SCOUT
                    this.title = "채용 제안이 도착했습니다!"
                    this.body = "${req.jobTitle} 공고를 통해 채용 제안이 왔습니다."
                    this.data = mapOf("teamPublicId" to req.teamPublicId, "jobTitle" to req.jobTitle)
                }
                notificationRepository.save(notif)
            }
        }

        return ApiResponse.ok(saved.toItem()).toResponseEntity(HttpStatus.CREATED)
    }
}

// ── Request bodies ──────────────────────────────────────────

data class PointChargeRequestBody(
    val amountKrw: Int,
    @field:NotBlank val paymentMethod: String,
)

data class CardPaymentConfirmRequest(
    @field:NotBlank val paymentKey: String,
    @field:NotBlank val orderId: String,
    val amountKrw: Int,
)

data class SendProposalRequest(
    @field:NotBlank val teamPublicId: String,
    @field:NotBlank val jobPublicId: String,
    val jobTitle: String? = null,
    val message: String? = null,
)

// ── Response DTOs ────────────────────────────────────────────

data class PointBalanceResponse(
    val balance: Int,
    val totalCharged: Int,
    val totalUsed: Int,
    val updatedAt: Instant,
)

data class PointChargeRequestItem(
    val publicId: String,
    val amountKrw: Int,
    val pointsToAdd: Int,
    val paymentMethod: String,
    val status: String,
    val adminNote: String?,
    val reviewedAt: Instant?,
    val createdAt: Instant,
)

data class TeamProposalItem(
    val publicId: String,
    val teamPublicId: String,
    val jobPublicId: String,
    val jobTitle: String?,
    val message: String?,
    val pointsUsed: Int,
    val status: String,
    val respondedAt: Instant?,
    val createdAt: Instant,
)

// ── Mapping extensions ───────────────────────────────────────

private fun PointChargeRequest.toItem() = PointChargeRequestItem(
    publicId = publicId.toString(),
    amountKrw = amountKrw,
    pointsToAdd = pointsToAdd,
    paymentMethod = paymentMethod,
    status = status,
    adminNote = adminNote,
    reviewedAt = reviewedAt,
    createdAt = createdAt,
)

private fun TeamProposal.toItem() = TeamProposalItem(
    publicId = publicId.toString(),
    teamPublicId = teamPublicId,
    jobPublicId = jobPublicId,
    jobTitle = jobTitle,
    message = message,
    pointsUsed = pointsUsed,
    status = status,
    respondedAt = respondedAt,
    createdAt = createdAt,
)
