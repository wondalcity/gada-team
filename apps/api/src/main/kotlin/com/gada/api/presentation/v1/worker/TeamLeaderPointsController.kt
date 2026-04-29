package com.gada.api.presentation.v1.worker

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.points.ChargeStatus
import com.gada.api.domain.points.PaymentMethod
import com.gada.api.domain.points.TeamLeaderPointChargeRequest
import com.gada.api.infrastructure.persistence.points.PointsRepository
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

@Tag(name = "Worker / Points", description = "팀장 포인트 충전 및 잔액 조회")
@RestController
@Transactional
@RequestMapping("/api/v1/worker/points")
@PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
class TeamLeaderPointsController(
    private val pointsRepository: PointsRepository,
    @Value("\${toss.payments.secret-key}") private val tossSecretKey: String,
) {

    private val restTemplate = RestTemplate()

    companion object {
        private val ALLOWED_AMOUNTS = setOf(300_000, 500_000, 1_000_000, 3_000_000, 5_000_000)
    }

    @Operation(summary = "포인트 잔액 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping
    fun getBalance(@CurrentUser principal: GadaPrincipal): ResponseEntity<ApiResponse<TlPointBalanceResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val account = pointsRepository.findOrCreateTeamLeaderAccount(userId)
        return ApiResponse.ok(
            TlPointBalanceResponse(
                balance = account.balance,
                totalCharged = account.totalCharged,
                totalUsed = account.totalUsed,
                updatedAt = account.updatedAt,
            )
        ).toResponseEntity()
    }

    @Operation(summary = "포인트 충전 요청 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/charges")
    fun listCharges(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<TlChargeRequestItem>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (requests, total) = pointsRepository.findTeamLeaderChargeRequestsByUserId(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(PageResponse(
            content = requests.map { it.toItem() },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "포인트 충전 요청 (무통장)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/charges")
    fun requestCharge(
        @Valid @RequestBody req: TlChargeRequestBody,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<TlChargeRequestItem>> {
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

        val pointsToAdd = req.amountKrw / 10_000
        val chargeRequest = TeamLeaderPointChargeRequest().also {
            it.userId = userId
            it.amountKrw = req.amountKrw
            it.pointsToAdd = pointsToAdd
            it.paymentMethod = req.paymentMethod
        }
        val saved = pointsRepository.saveTeamLeaderChargeRequest(chargeRequest)
        return ApiResponse.ok(saved.toItem()).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "카드 결제 확인 (토스페이먼츠)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/charges/card-confirm")
    fun confirmCardPayment(
        @Valid @RequestBody req: TlCardConfirmRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<TlChargeRequestItem>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        if (req.amountKrw !in ALLOWED_AMOUNTS) {
            throw BusinessException("허용되지 않는 충전 금액입니다.", "INVALID_CHARGE_AMOUNT")
        }

        if (pointsRepository.existsByTossPaymentKeyForTeamLeader(req.paymentKey)) {
            throw ConflictException("이미 처리된 결제입니다.", "PAYMENT_ALREADY_PROCESSED")
        }

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

        val pointsToAdd = req.amountKrw / 10_000
        val chargeRequest = TeamLeaderPointChargeRequest().also {
            it.userId = userId
            it.amountKrw = req.amountKrw
            it.pointsToAdd = pointsToAdd
            it.paymentMethod = PaymentMethod.CARD.name
            it.status = ChargeStatus.APPROVED.name
            it.reviewedAt = Instant.now()
            it.tossPaymentKey = req.paymentKey
            it.tossOrderId = req.orderId
        }
        pointsRepository.saveTeamLeaderChargeRequest(chargeRequest)

        val account = pointsRepository.findOrCreateTeamLeaderAccount(userId)
        account.addPoints(pointsToAdd)
        pointsRepository.saveTeamLeaderAccount(account)

        return ApiResponse.ok(chargeRequest.toItem()).toResponseEntity(HttpStatus.CREATED)
    }
}

// ── Request bodies ────────────────────────────────────────

data class TlChargeRequestBody(
    val amountKrw: Int,
    @field:NotBlank val paymentMethod: String,
)

data class TlCardConfirmRequest(
    @field:NotBlank val paymentKey: String,
    @field:NotBlank val orderId: String,
    val amountKrw: Int,
)

// ── Response DTOs ─────────────────────────────────────────

data class TlPointBalanceResponse(
    val balance: Int,
    val totalCharged: Int,
    val totalUsed: Int,
    val updatedAt: Instant,
)

data class TlChargeRequestItem(
    val publicId: String,
    val amountKrw: Int,
    val pointsToAdd: Int,
    val paymentMethod: String,
    val status: String,
    val adminNote: String?,
    val reviewedAt: Instant?,
    val createdAt: Instant,
)

// ── Mapping ───────────────────────────────────────────────

private fun TeamLeaderPointChargeRequest.toItem() = TlChargeRequestItem(
    publicId = publicId.toString(),
    amountKrw = amountKrw,
    pointsToAdd = pointsToAdd,
    paymentMethod = paymentMethod,
    status = status,
    adminNote = adminNote,
    reviewedAt = reviewedAt,
    createdAt = createdAt,
)
