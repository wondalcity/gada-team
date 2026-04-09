package com.gada.api.presentation.v1.application

import com.gada.api.application.application.ApplicationDetailResponse
import com.gada.api.application.application.ApplicationListResponse
import com.gada.api.application.application.ApplicationUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Tag(name = "Employer Applications", description = "지원서 ATS (고용주)")
@RestController
@RequestMapping("/api/v1/employer")
class EmployerApplicationController(
    private val applicationUseCase: ApplicationUseCase,
) {

    @Operation(summary = "공고별 지원서 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/jobs/{jobPublicId}/applications")
    fun getEmployerApplications(
        @PathVariable jobPublicId: UUID,
        @RequestParam(required = false) status: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationListResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.getEmployerApplications(userId, jobPublicId, status, page, size)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원서 상세", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/applications/{publicId}")
    fun getApplicationDetail(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.getApplicationDetail(userId, publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원서 상태 변경", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/applications/{publicId}/status")
    fun updateApplicationStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: UpdateApplicationStatusRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.updateApplicationStatus(userId, publicId, req.status, req.note)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원자 스카우트", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/applications/{publicId}/scout")
    fun scoutApplicant(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.scoutApplicant(userId, publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }
}

data class UpdateApplicationStatusRequest(
    val status: String,
    val note: String? = null,
)
