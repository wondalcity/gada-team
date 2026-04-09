package com.gada.api.presentation.v1.content

import com.gada.api.application.content.CategoryDetailResponse
import com.gada.api.application.content.CategoryListItem
import com.gada.api.application.content.ContentUseCase
import com.gada.api.application.job.JobUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.toResponseEntity
import com.gada.api.infrastructure.persistence.job.JobCategoryRepository
import com.gada.api.presentation.v1.job.JobListResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@Tag(name = "Categories", description = "Job category and intro content (public)")
@RestController
@RequestMapping("/api/v1/categories")
class ContentController(
    private val contentUseCase: ContentUseCase,
    private val jobUseCase: JobUseCase,
    private val jobCategoryRepository: JobCategoryRepository,
) {

    @Operation(summary = "카테고리 목록 조회")
    @GetMapping
    fun getCategories(
        @RequestParam(defaultValue = "ko") locale: String,
    ): ResponseEntity<ApiResponse<List<CategoryListItem>>> {
        val result = contentUseCase.getCategories(locale)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "카테고리 상세 조회 (소개 콘텐츠 + FAQ 포함)")
    @GetMapping("/{code}")
    fun getCategoryDetail(
        @PathVariable code: String,
        @RequestParam(defaultValue = "ko") locale: String,
    ): ResponseEntity<ApiResponse<CategoryDetailResponse>> {
        val result = contentUseCase.getCategoryDetail(code, locale)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "카테고리별 공개 공고 목록")
    @GetMapping("/{code}/jobs")
    fun getCategoryJobs(
        @PathVariable code: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ResponseEntity<ApiResponse<JobListResponse>> {
        val category = jobCategoryRepository.findByCode(code)
            ?: throw NotFoundException("JobCategory", code)

        val result = jobUseCase.getPublishedJobs(
            keyword = null,
            sido = null,
            sigungu = null,
            categoryId = category.id,
            payUnit = null,
            payMin = null,
            payMax = null,
            applicationType = null,
            visaType = null,
            nationality = null,
            healthCheckRequired = null,
            certification = null,
            equipment = null,
            lat = null,
            lng = null,
            radius = null,
            page = page,
            size = size,
        )
        return ApiResponse.ok(result).toResponseEntity()
    }
}
