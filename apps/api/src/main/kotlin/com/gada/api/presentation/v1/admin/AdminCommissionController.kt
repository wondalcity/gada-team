package com.gada.api.presentation.v1.admin

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.commission.CommissionStatus
import com.gada.api.domain.commission.EmployerSubsidy
import com.gada.api.domain.commission.HiringCommission
import com.gada.api.domain.commission.SubsidyStatus
import com.gada.api.domain.commission.SubsidyType
import com.gada.api.infrastructure.persistence.commission.CommissionRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Admin / Commissions", description = "수수료 및 채용 지원금 관리 (관리자)")
@RestController
@Transactional
@RequestMapping("/api/v1/admin/commissions")
@PreAuthorize("hasRole('ADMIN')")
class AdminCommissionController(
    private val commissionRepository: CommissionRepository,
) {

    // ═══════════════════════════════════════════════════════
    // HIRING COMMISSIONS — LIST
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "수수료 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping
    fun listCommissions(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: String?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<AdminCommissionItem>>> {
        val statusFilter = status?.let {
            runCatching { CommissionStatus.valueOf(it) }.getOrElse {
                throw BusinessException("허용되지 않는 상태 값입니다. (PENDING, PAID, WAIVED)", "INVALID_STATUS")
            }
        }
        val (items, total) = commissionRepository.findCommissionsByStatus(statusFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(
            PageResponse(
                content = items.map { it.toAdminItem() },
                page = page, size = size,
                totalElements = total, totalPages = totalPages,
                isFirst = page == 0, isLast = page >= totalPages - 1,
            )
        ).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // HIRING COMMISSIONS — CREATE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "수수료 항목 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping
    fun createCommission(
        @RequestBody @Valid req: CreateCommissionRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminCommissionItem>> {
        val commission = HiringCommission().apply {
            employerId = req.employerId
            companyName = req.companyName
            jobTitle = req.jobTitle
            workerName = req.workerName
            amountKrw = req.amountKrw
            ratePct = req.ratePct?.let { BigDecimal(it.toString()) }
            dueDate = req.dueDate?.let { LocalDate.parse(it) }
        }
        val saved = commissionRepository.saveCommission(commission)
        return ApiResponse.ok(saved.toAdminItem()).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // HIRING COMMISSIONS — MARK PAID
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "수수료 납부 처리", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/{publicId}/paid")
    fun markCommissionPaid(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: CommissionActionRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminCommissionItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()
        val commission = commissionRepository.findCommissionByPublicId(publicId)
            ?: throw NotFoundException("HiringCommission", publicId)
        if (!commission.isPending) {
            throw BusinessException("이미 처리된 항목입니다. (현재 상태: ${commission.status})", "ALREADY_REVIEWED")
        }
        commission.markPaid(adminId, req?.note)
        commissionRepository.saveCommission(commission)
        return ApiResponse.ok(commission.toAdminItem()).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // HIRING COMMISSIONS — WAIVE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "수수료 면제 처리", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/{publicId}/waive")
    fun waiveCommission(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: CommissionActionRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminCommissionItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()
        val commission = commissionRepository.findCommissionByPublicId(publicId)
            ?: throw NotFoundException("HiringCommission", publicId)
        if (!commission.isPending) {
            throw BusinessException("이미 처리된 항목입니다. (현재 상태: ${commission.status})", "ALREADY_REVIEWED")
        }
        commission.waive(adminId, req?.note)
        commissionRepository.saveCommission(commission)
        return ApiResponse.ok(commission.toAdminItem()).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // SUBSIDIES — LIST
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "채용 지원금 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/subsidies")
    fun listSubsidies(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: String?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<AdminSubsidyItem>>> {
        val statusFilter = status?.let {
            runCatching { SubsidyStatus.valueOf(it) }.getOrElse {
                throw BusinessException("허용되지 않는 상태 값입니다.", "INVALID_STATUS")
            }
        }
        val (items, total) = commissionRepository.findSubsidiesByStatus(statusFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(
            PageResponse(
                content = items.map { it.toAdminItem() },
                page = page, size = size,
                totalElements = total, totalPages = totalPages,
                isFirst = page == 0, isLast = page >= totalPages - 1,
            )
        ).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // SUBSIDIES — CREATE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "채용 지원금 항목 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/subsidies")
    fun createSubsidy(
        @RequestBody @Valid req: CreateSubsidyRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminSubsidyItem>> {
        val subsidy = EmployerSubsidy().apply {
            employerId = req.employerId
            companyName = req.companyName
            subsidyType = runCatching { SubsidyType.valueOf(req.subsidyType) }.getOrElse { SubsidyType.PLATFORM }.name
            title = req.title
            description = req.description
            amountKrw = req.amountKrw
        }
        val saved = commissionRepository.saveSubsidy(subsidy)
        return ApiResponse.ok(saved.toAdminItem()).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // SUBSIDIES — APPROVE / REJECT / DISBURSE
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "채용 지원금 승인", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/subsidies/{publicId}/approve")
    fun approveSubsidy(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: CommissionActionRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminSubsidyItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()
        val subsidy = commissionRepository.findSubsidyByPublicId(publicId)
            ?: throw NotFoundException("EmployerSubsidy", publicId)
        if (!subsidy.isPending) {
            throw BusinessException("이미 처리된 항목입니다.", "ALREADY_REVIEWED")
        }
        subsidy.approve(adminId, req?.note)
        commissionRepository.saveSubsidy(subsidy)
        return ApiResponse.ok(subsidy.toAdminItem()).toResponseEntity()
    }

    @Operation(summary = "채용 지원금 거절", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/subsidies/{publicId}/reject")
    fun rejectSubsidy(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: CommissionActionRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminSubsidyItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()
        val subsidy = commissionRepository.findSubsidyByPublicId(publicId)
            ?: throw NotFoundException("EmployerSubsidy", publicId)
        if (!subsidy.isPending) {
            throw BusinessException("이미 처리된 항목입니다.", "ALREADY_REVIEWED")
        }
        subsidy.reject(adminId, req?.note)
        commissionRepository.saveSubsidy(subsidy)
        return ApiResponse.ok(subsidy.toAdminItem()).toResponseEntity()
    }

    @Operation(summary = "채용 지원금 지급 완료", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/subsidies/{publicId}/disburse")
    fun disburseSubsidy(
        @PathVariable publicId: UUID,
        @RequestBody(required = false) req: CommissionActionRequest?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminSubsidyItem>> {
        val adminId = principal.userId ?: throw UnauthorizedException()
        val subsidy = commissionRepository.findSubsidyByPublicId(publicId)
            ?: throw NotFoundException("EmployerSubsidy", publicId)
        if (!subsidy.isApproved) {
            throw BusinessException("승인 상태의 지원금만 지급 처리할 수 있습니다.", "INVALID_STATE")
        }
        subsidy.disburse(adminId, req?.note)
        commissionRepository.saveSubsidy(subsidy)
        return ApiResponse.ok(subsidy.toAdminItem()).toResponseEntity()
    }
}

// ── Extensions ─────────────────────────────────────────────────

private fun HiringCommission.toAdminItem() = AdminCommissionItem(
    publicId = publicId.toString(),
    employerId = employerId,
    companyName = companyName,
    jobTitle = jobTitle,
    workerName = workerName,
    amountKrw = amountKrw,
    ratePct = ratePct?.toDouble(),
    status = status,
    adminNote = adminNote,
    reviewedBy = reviewedBy,
    reviewedAt = reviewedAt,
    dueDate = dueDate?.toString(),
    createdAt = createdAt,
)

private fun EmployerSubsidy.toAdminItem() = AdminSubsidyItem(
    publicId = publicId.toString(),
    employerId = employerId,
    companyName = companyName,
    subsidyType = subsidyType,
    title = title,
    description = description,
    amountKrw = amountKrw,
    status = status,
    adminNote = adminNote,
    reviewedBy = reviewedBy,
    reviewedAt = reviewedAt,
    disbursedAt = disbursedAt,
    createdAt = createdAt,
)

// ── Request / Response DTOs ──────────────────────────────────

data class CreateCommissionRequest(
    val employerId: Long,
    val companyName: String? = null,
    val jobTitle: String? = null,
    val workerName: String? = null,
    val amountKrw: Long,
    val ratePct: Double? = null,
    val dueDate: String? = null,
)

data class CreateSubsidyRequest(
    val employerId: Long,
    val companyName: String? = null,
    @field:NotBlank val subsidyType: String,
    @field:NotBlank val title: String,
    val description: String? = null,
    val amountKrw: Long,
)

data class CommissionActionRequest(
    val note: String? = null,
)

data class AdminCommissionItem(
    val publicId: String,
    val employerId: Long,
    val companyName: String?,
    val jobTitle: String?,
    val workerName: String?,
    val amountKrw: Long,
    val ratePct: Double?,
    val status: String,
    val adminNote: String?,
    val reviewedBy: Long?,
    val reviewedAt: Instant?,
    val dueDate: String?,
    val createdAt: Instant,
)

data class AdminSubsidyItem(
    val publicId: String,
    val employerId: Long,
    val companyName: String?,
    val subsidyType: String,
    val title: String,
    val description: String?,
    val amountKrw: Long,
    val status: String,
    val adminNote: String?,
    val reviewedBy: Long?,
    val reviewedAt: Instant?,
    val disbursedAt: Instant?,
    val createdAt: Instant,
)
