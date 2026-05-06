package com.gada.api.presentation.v1.employer

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.commission.EmployerSubsidy
import com.gada.api.domain.commission.HiringCommission
import com.gada.api.infrastructure.persistence.commission.CommissionRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import kotlin.math.ceil

@Tag(name = "Employer / Commissions", description = "고용주 수수료 및 채용 지원금 조회")
@RestController
@Transactional(readOnly = true)
@RequestMapping("/api/v1/employer/commissions")
@PreAuthorize("hasRole('EMPLOYER')")
class CommissionController(
    private val commissionRepository: CommissionRepository,
) {

    // ═══════════════════════════════════════════════════════
    // MY COMMISSIONS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "내 수수료 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping
    fun getMyCommissions(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<EmployerCommissionItem>>> {
        val employerId = principal.userId ?: throw UnauthorizedException()
        val (items, total) = commissionRepository.findCommissionsByEmployerId(employerId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(
            PageResponse(
                content = items.map { it.toEmployerItem() },
                page = page, size = size,
                totalElements = total, totalPages = totalPages,
                isFirst = page == 0, isLast = page >= totalPages - 1,
            )
        ).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // MY SUBSIDIES
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "내 채용 지원금 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/subsidies")
    fun getMySubsidies(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<EmployerSubsidyItem>>> {
        val employerId = principal.userId ?: throw UnauthorizedException()
        val (items, total) = commissionRepository.findSubsidiesByEmployerId(employerId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(
            PageResponse(
                content = items.map { it.toEmployerItem() },
                page = page, size = size,
                totalElements = total, totalPages = totalPages,
                isFirst = page == 0, isLast = page >= totalPages - 1,
            )
        ).toResponseEntity()
    }
}

// ── Extensions ─────────────────────────────────────────────────

private fun HiringCommission.toEmployerItem() = EmployerCommissionItem(
    publicId = publicId.toString(),
    jobTitle = jobTitle,
    workerName = workerName,
    amountKrw = amountKrw,
    ratePct = ratePct?.toDouble(),
    status = status,
    dueDate = dueDate?.toString(),
    createdAt = createdAt,
)

private fun EmployerSubsidy.toEmployerItem() = EmployerSubsidyItem(
    publicId = publicId.toString(),
    subsidyType = subsidyType,
    title = title,
    description = description,
    amountKrw = amountKrw,
    status = status,
    disbursedAt = disbursedAt,
    createdAt = createdAt,
)

// ── Response DTOs ────────────────────────────────────────────

data class EmployerCommissionItem(
    val publicId: String,
    val jobTitle: String?,
    val workerName: String?,
    val amountKrw: Long,
    val ratePct: Double?,
    val status: String,
    val dueDate: String?,
    val createdAt: Instant,
)

data class EmployerSubsidyItem(
    val publicId: String,
    val subsidyType: String,
    val title: String,
    val description: String?,
    val amountKrw: Long,
    val status: String,
    val disbursedAt: Instant?,
    val createdAt: Instant,
)
