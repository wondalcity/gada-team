package com.gada.api.presentation.v1.company

import com.gada.api.application.company.CompanyUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.common.exception.UnauthorizedException
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Tag(name = "Sites", description = "현장 관리")
@RestController
@RequestMapping("/api/v1/sites")
class SiteController(private val companyUseCase: CompanyUseCase) {

    @Operation(summary = "현장 상세 조회 (공개)")
    @GetMapping("/{publicId}")
    fun getSite(@PathVariable publicId: UUID): ResponseEntity<ApiResponse<SiteResponse>> {
        return ApiResponse.ok(companyUseCase.getSiteByPublicId(publicId)).toResponseEntity()
    }

    @Operation(summary = "현장 수정", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/{publicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun updateSite(
        @PathVariable publicId: UUID,
        @Valid @RequestBody req: UpdateSiteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SiteResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.updateSite(userId, publicId, req)).toResponseEntity()
    }

    @Operation(summary = "현장 상태 변경", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/{publicId}/status")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun patchSiteStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: UpdateSiteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SiteResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.updateSite(userId, publicId, req)).toResponseEntity()
    }
}
