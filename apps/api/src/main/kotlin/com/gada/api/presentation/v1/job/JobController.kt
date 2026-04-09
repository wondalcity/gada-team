package com.gada.api.presentation.v1.job

import com.gada.api.application.job.JobUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Tag(name = "Jobs", description = "Job postings")
@RestController
class JobController(private val jobUseCase: JobUseCase) {

    // ─── Public endpoints ─────────────────────────────────────────────────

    @Operation(summary = "공고 검색 (공개)")
    @GetMapping("/api/v1/jobs")
    fun getPublishedJobs(
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) sido: String?,
        @RequestParam(required = false) sigungu: String?,
        @RequestParam(required = false) categoryId: Long?,
        @RequestParam(required = false) payUnit: String?,
        @RequestParam(required = false) payMin: Int?,
        @RequestParam(required = false) payMax: Int?,
        @RequestParam(required = false) applicationType: String?,
        @RequestParam(required = false) visaType: String?,
        @RequestParam(required = false) nationality: String?,
        @RequestParam(required = false) healthCheckRequired: Boolean?,
        @RequestParam(required = false) certification: String?,
        @RequestParam(required = false) equipment: String?,
        @RequestParam(required = false) lat: Double?,
        @RequestParam(required = false) lng: Double?,
        @RequestParam(required = false) radius: Double?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<JobListResponse>> {
        val result = jobUseCase.getPublishedJobs(
            keyword = keyword,
            sido = sido,
            sigungu = sigungu,
            categoryId = categoryId,
            payUnit = payUnit,
            payMin = payMin,
            payMax = payMax,
            applicationType = applicationType,
            visaType = visaType,
            nationality = nationality,
            healthCheckRequired = healthCheckRequired,
            certification = certification,
            equipment = equipment,
            lat = lat,
            lng = lng,
            radius = radius,
            page = page,
            size = size,
        )
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "공고 상세 조회 (공개)")
    @GetMapping("/api/v1/jobs/{publicId}")
    fun getJobDetail(@PathVariable publicId: UUID): ResponseEntity<ApiResponse<JobDetailResponse>> {
        val result = jobUseCase.getJobDetail(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    // ─── Employer endpoints ───────────────────────────────────────────────

    @Operation(summary = "내 공고 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/api/v1/jobs/mine")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun getMyJobs(
        @CurrentUser principal: GadaPrincipal,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<JobListResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = jobUseCase.getMyJobs(userId, page, size)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "공고 등록", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/api/v1/jobs")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun createJob(
        @CurrentUser principal: GadaPrincipal,
        @Valid @RequestBody request: CreateJobRequest,
    ): ResponseEntity<ApiResponse<JobDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = jobUseCase.createJob(userId, request)
        return ApiResponse.ok(result).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "공고 수정", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/api/v1/jobs/{publicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun updateJob(
        @CurrentUser principal: GadaPrincipal,
        @PathVariable publicId: UUID,
        @Valid @RequestBody request: UpdateJobRequest,
    ): ResponseEntity<ApiResponse<JobDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = jobUseCase.updateJob(userId, publicId, request)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "공고 상태 변경", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/api/v1/jobs/{publicId}/status")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    fun patchJobStatus(
        @CurrentUser principal: GadaPrincipal,
        @PathVariable publicId: UUID,
        @Valid @RequestBody request: PatchJobStatusRequest,
    ): ResponseEntity<ApiResponse<JobDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = jobUseCase.patchJobStatus(userId, publicId, request)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "공고 삭제 (soft delete)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/api/v1/jobs/{publicId}")
    @PreAuthorize("hasRole('EMPLOYER')")
    fun deleteJob(
        @CurrentUser principal: GadaPrincipal,
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        jobUseCase.deleteJob(userId, publicId)
        return ApiResponse.noContent().toResponseEntity(HttpStatus.NO_CONTENT)
    }
}
