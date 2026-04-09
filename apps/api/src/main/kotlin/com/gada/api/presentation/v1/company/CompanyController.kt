package com.gada.api.presentation.v1.company

import com.gada.api.application.company.CompanyUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.presentation.v1.job.JobListResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Tag(name = "Companies", description = "Company and Site management")
@RestController
@RequestMapping("/api/v1/companies")
class CompanyController(private val companyUseCase: CompanyUseCase) {

    @Operation(summary = "회사 등록", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping
    @PreAuthorize("hasRole('EMPLOYER')")
    fun createCompany(
        @Valid @RequestBody req: CreateCompanyRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<CompanyResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.createCompany(userId, req)).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "내 회사 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/mine")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun getMyCompany(@CurrentUser principal: GadaPrincipal): ResponseEntity<ApiResponse<CompanyResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.getMyCompany(userId)).toResponseEntity()
    }

    @Operation(summary = "회사 상세 조회 (공개)")
    @GetMapping("/{publicId}")
    fun getCompany(@PathVariable publicId: UUID): ResponseEntity<ApiResponse<CompanyResponse>> {
        return ApiResponse.ok(companyUseCase.getByPublicId(publicId)).toResponseEntity()
    }

    @Operation(summary = "회사 정보 수정", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/{publicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun updateCompany(
        @PathVariable publicId: UUID,
        @Valid @RequestBody req: UpdateCompanyRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<CompanyResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.updateCompany(userId, publicId, req)).toResponseEntity()
    }

    @Operation(summary = "현장 등록", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/{publicId}/sites")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun createSite(
        @PathVariable publicId: UUID,
        @Valid @RequestBody req: CreateSiteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SiteResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.createSite(userId, publicId, req)).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "현장 목록 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/{publicId}/sites")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun getSites(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<List<SiteResponse>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.getSites(userId, publicId)).toResponseEntity()
    }

    @Operation(summary = "현장 단건 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/{companyPublicId}/sites/{sitePublicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun getSite(
        @PathVariable companyPublicId: UUID,
        @PathVariable sitePublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SiteResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        companyUseCase.getMyCompany(userId) // throws if no company
        return ApiResponse.ok(companyUseCase.getSiteByPublicId(sitePublicId)).toResponseEntity()
    }

    @Operation(summary = "현장 수정", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/{companyPublicId}/sites/{sitePublicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun updateSite(
        @PathVariable companyPublicId: UUID,
        @PathVariable sitePublicId: UUID,
        @Valid @RequestBody req: UpdateSiteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SiteResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(companyUseCase.updateSite(userId, sitePublicId, req)).toResponseEntity()
    }

    @Operation(summary = "현장 삭제", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/{companyPublicId}/sites/{sitePublicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun deleteSite(
        @PathVariable companyPublicId: UUID,
        @PathVariable sitePublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        companyUseCase.deleteSite(userId, sitePublicId)
        return ApiResponse.noContent().toResponseEntity(HttpStatus.NO_CONTENT)
    }

    @Operation(summary = "회사 공개 공고 목록")
    @GetMapping("/{publicId}/jobs")
    fun getCompanyJobs(
        @PathVariable publicId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ResponseEntity<ApiResponse<JobListResponse>> {
        return ApiResponse.ok(companyUseCase.getPublishedJobsByCompany(publicId, page, size)).toResponseEntity()
    }
}
