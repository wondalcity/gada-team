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
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Tag(name = "Applications", description = "지원서 관리 (근로자)")
@RestController
class ApplicationController(
    private val applicationUseCase: ApplicationUseCase,
) {

    @Operation(summary = "공고 지원", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/api/v1/jobs/{jobPublicId}/apply")
    fun applyForJob(
        @PathVariable jobPublicId: UUID,
        @RequestBody req: ApplyForJobRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.applyForJob(
            userId = userId,
            jobPublicId = jobPublicId,
            applicationType = req.applicationType,
            teamPublicId = req.teamPublicId,
            coverLetter = req.coverLetter,
        )
        return ApiResponse.ok(result).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "내 지원서 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/api/v1/applications/mine")
    fun getMyApplications(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationListResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.getMyApplications(userId, page, size)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원 취소", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/api/v1/applications/{publicId}")
    fun withdrawApplication(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        applicationUseCase.withdrawApplication(userId, publicId)
        return ApiResponse.noContent().toResponseEntity(HttpStatus.NO_CONTENT)
    }
}

data class ApplyForJobRequest(
    val applicationType: String = "INDIVIDUAL",
    val teamPublicId: UUID? = null,
    val coverLetter: String? = null,
)
