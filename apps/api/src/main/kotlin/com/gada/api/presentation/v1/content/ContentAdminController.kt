package com.gada.api.presentation.v1.content

import com.gada.api.application.content.AdminCategoryItem
import com.gada.api.application.content.ContentUseCase
import com.gada.api.application.content.FaqListResponse
import com.gada.api.application.content.FaqResponse
import com.gada.api.application.content.IntroContentListResponse
import com.gada.api.application.content.IntroContentResponse
import com.gada.api.application.content.UpdateCategoryRequest
import com.gada.api.application.content.UpsertFaqRequest
import com.gada.api.application.content.UpsertIntroContentRequest
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

data class CreateIntroContentRequest(
    val categoryCode: String,
    val locale: String,
    val content: UpsertIntroContentRequest,
)

@Tag(name = "Admin - Content", description = "Admin endpoints for managing intro content, FAQs, and categories")
@RestController
@RequestMapping("/api/v1/admin/content")
@PreAuthorize("hasRole('ADMIN')")
class ContentAdminController(
    private val contentUseCase: ContentUseCase,
) {

    // ─── Categories ───────────────────────────────────────────────────────────

    @Operation(summary = "카테고리 목록 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/categories")
    fun getAdminCategories(): ResponseEntity<ApiResponse<List<AdminCategoryItem>>> {
        val result = contentUseCase.getAdminCategories()
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "카테고리 수정 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/categories/{code}")
    fun updateCategory(
        @PathVariable code: String,
        @RequestBody req: UpdateCategoryRequest,
    ): ResponseEntity<ApiResponse<AdminCategoryItem>> {
        val result = contentUseCase.updateCategory(code, req)
        return ApiResponse.ok(result).toResponseEntity()
    }

    // ─── Intro Contents ───────────────────────────────────────────────────────

    @Operation(summary = "소개 콘텐츠 목록 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/intro")
    fun listIntroContents(
        @RequestParam(required = false) isPublished: Boolean?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<IntroContentListResponse>> {
        val result = contentUseCase.getAdminIntroContents(isPublished, page, size)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "소개 콘텐츠 생성 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/intro")
    fun createIntroContent(
        @RequestBody req: CreateIntroContentRequest,
    ): ResponseEntity<ApiResponse<IntroContentResponse>> {
        val result = contentUseCase.createIntroContent(req.categoryCode, req.locale, req.content)
        return ApiResponse.ok(result).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "소개 콘텐츠 단건 조회 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/intro/{publicId}")
    fun getIntroContent(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<IntroContentResponse>> {
        val result = contentUseCase.getIntroContentByPublicId(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "소개 콘텐츠 수정 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/intro/{publicId}")
    fun updateIntroContent(
        @PathVariable publicId: UUID,
        @RequestBody req: UpsertIntroContentRequest,
    ): ResponseEntity<ApiResponse<IntroContentResponse>> {
        val result = contentUseCase.updateIntroContent(publicId, req)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "소개 콘텐츠 발행 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/intro/{publicId}/publish")
    fun publishIntroContent(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<IntroContentResponse>> {
        val result = contentUseCase.publishIntroContent(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "소개 콘텐츠 발행 취소 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/intro/{publicId}/unpublish")
    fun unpublishIntroContent(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<IntroContentResponse>> {
        val result = contentUseCase.unpublishIntroContent(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "소개 콘텐츠 삭제 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/intro/{publicId}")
    fun deleteIntroContent(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<Nothing>> {
        contentUseCase.deleteIntroContent(publicId)
        return ApiResponse.noContent().toResponseEntity()
    }

    // ─── FAQs ─────────────────────────────────────────────────────────────────

    @Operation(summary = "FAQ 목록 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/faqs")
    fun listFaqs(
        @RequestParam(required = false) locale: String?,
        @RequestParam(required = false) categoryCode: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<FaqListResponse>> {
        val result = contentUseCase.getAdminFaqs(locale, categoryCode, page, size)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "FAQ 생성 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/faqs")
    fun createFaq(
        @RequestBody req: UpsertFaqRequest,
    ): ResponseEntity<ApiResponse<FaqResponse>> {
        val result = contentUseCase.createFaq(req)
        return ApiResponse.ok(result).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "FAQ 수정 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/faqs/{publicId}")
    fun updateFaq(
        @PathVariable publicId: UUID,
        @RequestBody req: UpsertFaqRequest,
    ): ResponseEntity<ApiResponse<FaqResponse>> {
        val result = contentUseCase.updateFaq(publicId, req)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "FAQ 삭제 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/faqs/{publicId}")
    fun deleteFaq(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<Nothing>> {
        contentUseCase.deleteFaq(publicId)
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "FAQ 발행 (어드민)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/faqs/{publicId}/publish")
    fun publishFaq(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<FaqResponse>> {
        val result = contentUseCase.publishFaq(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }
}
