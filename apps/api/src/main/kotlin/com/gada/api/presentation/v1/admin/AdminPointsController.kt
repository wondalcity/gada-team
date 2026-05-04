package com.gada.api.presentation.v1.admin

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.points.ChargeStatus
import com.gada.api.infrastructure.persistence.points.PointsRepository
import com.gada.api.presentation.v1.employer.PointChargeRequestItem
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Admin / Points", description = "포인트 충전 요청 관리 (관리자)")
@RestController
@Transactional
@RequestMapping("/api/v1/admin/points")
@PreAuthorize("hasRole('ADMIN')")
class AdminPointsController(
    private val pointsRepository: PointsRepository,
) {

    // ═══════════════════════════════════════════════════════
    // CHARGE REQUESTS — LIST
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "충전 요청 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/charges")
    fun listChargeRequests(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: String?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<AdminChargeRequestItem>>> {
        val statusFilter = status?.let {
            runCatching { ChargeStatus.valueOf(it) }.getOrElse {
                throw BusinessException("허용되지 않는 상태 값입니다. (PENDING, APPROVED, REJECTED)", "INVALID_STATUS")
            }
        }

        val (requests, total) = pointsRepository.findChargeRequestsByStatus(statusFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val response = PageResponse(
            content = requests.map { req ->
                AdminChargeRequestItem(
                    publicId = req.publicId.toString(),
                    userId = req.userId,
                    amountKrw = req.amountKrw,
                    pointsToAdd = req.pointsToAdd,
                    paymentMethod = req.paymentMethod,
                    status = req.status,
                    adminNote = req.adminNote,
                    reviewedBy = req.reviewedBy,
                    reviewedAt = req.reviewedAt,
                    createdAt = req.createdAt,
                )
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // CHARGE REQUESTS — APPROVE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "충전 요청 승인", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/charges/{publicId}/approve")
    fun approveChargeRequest(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: ReviewChargeRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointChargeRequestItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()

        val chargeRequest = pointsRepository.findChargeRequestByPublicId(publicId)
            ?: throw NotFoundException("PointChargeRequest", publicId)

        if (!chargeRequest.isPending) {
            throw BusinessException("이미 처리된 충전 요청입니다. (현재 상태: ${chargeRequest.status})", "ALREADY_REVIEWED")
        }

        chargeRequest.approve(adminId, req?.note)
        pointsRepository.saveChargeRequest(chargeRequest)

        // Add points to employer account
        val account = pointsRepository.findOrCreateAccount(chargeRequest.userId)
        account.addPoints(chargeRequest.pointsToAdd)
        pointsRepository.saveAccount(account)

        return ApiResponse.ok(
            PointChargeRequestItem(
                publicId = chargeRequest.publicId.toString(),
                amountKrw = chargeRequest.amountKrw,
                pointsToAdd = chargeRequest.pointsToAdd,
                paymentMethod = chargeRequest.paymentMethod,
                status = chargeRequest.status,
                adminNote = chargeRequest.adminNote,
                reviewedAt = chargeRequest.reviewedAt,
                createdAt = chargeRequest.createdAt,
            )
        ).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // CHARGE REQUESTS — REJECT
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "충전 요청 거절", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/charges/{publicId}/reject")
    fun rejectChargeRequest(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: ReviewChargeRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointChargeRequestItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()

        val chargeRequest = pointsRepository.findChargeRequestByPublicId(publicId)
            ?: throw NotFoundException("PointChargeRequest", publicId)

        if (!chargeRequest.isPending) {
            throw BusinessException("이미 처리된 충전 요청입니다. (현재 상태: ${chargeRequest.status})", "ALREADY_REVIEWED")
        }

        chargeRequest.reject(adminId, req?.note)
        pointsRepository.saveChargeRequest(chargeRequest)

        return ApiResponse.ok(
            PointChargeRequestItem(
                publicId = chargeRequest.publicId.toString(),
                amountKrw = chargeRequest.amountKrw,
                pointsToAdd = chargeRequest.pointsToAdd,
                paymentMethod = chargeRequest.paymentMethod,
                status = chargeRequest.status,
                adminNote = chargeRequest.adminNote,
                reviewedAt = chargeRequest.reviewedAt,
                createdAt = chargeRequest.createdAt,
            )
        ).toResponseEntity()
    }
}

    // ═══════════════════════════════════════════════════════
    // TEAM LEADER CHARGE REQUESTS — LIST
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "팀장 충전 요청 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/tl-charges")
    fun listTlChargeRequests(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: String?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<AdminChargeRequestItem>>> {
        val statusFilter = status?.let {
            runCatching { ChargeStatus.valueOf(it) }.getOrElse {
                throw BusinessException("허용되지 않는 상태 값입니다.", "INVALID_STATUS")
            }
        }

        val (requests, total) = pointsRepository.findTeamLeaderChargeRequestsByStatus(statusFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val response = PageResponse(
            content = requests.map { req ->
                AdminChargeRequestItem(
                    publicId = req.publicId.toString(),
                    userId = req.userId,
                    amountKrw = req.amountKrw,
                    pointsToAdd = req.pointsToAdd,
                    paymentMethod = req.paymentMethod,
                    status = req.status,
                    adminNote = req.adminNote,
                    reviewedBy = null,
                    reviewedAt = req.reviewedAt,
                    createdAt = req.createdAt,
                )
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // TEAM LEADER CHARGE REQUESTS — APPROVE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "팀장 충전 요청 승인", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/tl-charges/{publicId}/approve")
    fun approveTlChargeRequest(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: ReviewChargeRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointChargeRequestItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()

        val chargeRequest = pointsRepository.findTeamLeaderChargeRequestByPublicId(publicId)
            ?: throw NotFoundException("TeamLeaderPointChargeRequest", publicId)

        if (!chargeRequest.isPending) {
            throw BusinessException("이미 처리된 충전 요청입니다. (현재 상태: ${chargeRequest.status})", "ALREADY_REVIEWED")
        }

        chargeRequest.approve(adminId, req?.note)
        pointsRepository.saveTeamLeaderChargeRequest(chargeRequest)

        val account = pointsRepository.findOrCreateTeamLeaderAccount(chargeRequest.userId)
        account.addPoints(chargeRequest.pointsToAdd)
        pointsRepository.saveTeamLeaderAccount(account)

        return ApiResponse.ok(
            PointChargeRequestItem(
                publicId = chargeRequest.publicId.toString(),
                amountKrw = chargeRequest.amountKrw,
                pointsToAdd = chargeRequest.pointsToAdd,
                paymentMethod = chargeRequest.paymentMethod,
                status = chargeRequest.status,
                adminNote = chargeRequest.adminNote,
                reviewedAt = chargeRequest.reviewedAt,
                createdAt = chargeRequest.createdAt,
            )
        ).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // TEAM LEADER CHARGE REQUESTS — REJECT
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "팀장 충전 요청 거절", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/tl-charges/{publicId}/reject")
    fun rejectTlChargeRequest(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: ReviewChargeRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PointChargeRequestItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()

        val chargeRequest = pointsRepository.findTeamLeaderChargeRequestByPublicId(publicId)
            ?: throw NotFoundException("TeamLeaderPointChargeRequest", publicId)

        if (!chargeRequest.isPending) {
            throw BusinessException("이미 처리된 충전 요청입니다. (현재 상태: ${chargeRequest.status})", "ALREADY_REVIEWED")
        }

        chargeRequest.reject(adminId, req?.note)
        pointsRepository.saveTeamLeaderChargeRequest(chargeRequest)

        return ApiResponse.ok(
            PointChargeRequestItem(
                publicId = chargeRequest.publicId.toString(),
                amountKrw = chargeRequest.amountKrw,
                pointsToAdd = chargeRequest.pointsToAdd,
                paymentMethod = chargeRequest.paymentMethod,
                status = chargeRequest.status,
                adminNote = chargeRequest.adminNote,
                reviewedAt = chargeRequest.reviewedAt,
                createdAt = chargeRequest.createdAt,
            )
        ).toResponseEntity()
    }
}

// ── Request / Response DTOs ──────────────────────────────────

data class ReviewChargeRequest(
    val note: String? = null,
)

data class AdminChargeRequestItem(
    val publicId: String,
    val userId: Long,
    val amountKrw: Int,
    val pointsToAdd: Int,
    val paymentMethod: String,
    val status: String,
    val adminNote: String?,
    val reviewedBy: Long?,
    val reviewedAt: Instant?,
    val createdAt: Instant,
)
