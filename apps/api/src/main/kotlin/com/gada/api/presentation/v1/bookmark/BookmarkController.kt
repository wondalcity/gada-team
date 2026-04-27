package com.gada.api.presentation.v1.bookmark

import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.bookmark.JobBookmark
import com.gada.api.infrastructure.persistence.bookmark.BookmarkRepository
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.util.UUID
import kotlin.math.ceil

data class BookmarkStatusResponse(val bookmarked: Boolean, val jobPublicId: UUID)
data class BookmarkCountResponse(val count: Long)
data class BookmarkedJobItem(
    val bookmarkId: Long,
    val bookmarkedAt: java.time.Instant,
    val publicId: UUID,
    val title: String,
    val companyName: String,
    val sido: String?,
    val sigungu: String?,
    val payMin: Int?,
    val payMax: Int?,
    val payUnit: String,
    val status: String,
)
data class BookmarkedJobsResponse(
    val content: List<BookmarkedJobItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

@Tag(name = "Bookmarks", description = "근로자 채용공고 찜")
@RestController
@Transactional
@RequestMapping("/api/v1/bookmarks")
class BookmarkController(
    private val bookmarkRepository: BookmarkRepository,
    private val jobRepository: JobRepository,
    private val userRepository: UserRepository,
) {

    @Operation(summary = "채용공고 찜 추가", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/jobs/{jobPublicId}")
    fun addBookmark(
        @PathVariable jobPublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<BookmarkStatusResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")
        val user = userRepository.findById(userId) ?: throw UnauthorizedException("사용자를 찾을 수 없습니다.")
        val job = jobRepository.findByPublicId(jobPublicId) ?: throw NotFoundException("Job", jobPublicId)

        if (bookmarkRepository.existsBookmark(userId, job.id)) {
            throw ConflictException("이미 찜한 공고입니다.", "ALREADY_BOOKMARKED")
        }

        val bookmark = JobBookmark().also {
            it.user = user
            it.job = job
        }
        bookmarkRepository.saveBookmark(bookmark)

        return ApiResponse.ok(BookmarkStatusResponse(bookmarked = true, jobPublicId = jobPublicId))
            .toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "채용공고 찜 취소", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/jobs/{jobPublicId}")
    fun removeBookmark(
        @PathVariable jobPublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<BookmarkStatusResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")
        val job = jobRepository.findByPublicId(jobPublicId) ?: throw NotFoundException("Job", jobPublicId)

        val bookmark = bookmarkRepository.findJobBookmark(userId, job.id)
            ?: throw NotFoundException("Bookmark", jobPublicId)
        bookmarkRepository.deleteBookmark(bookmark)

        return ApiResponse.ok(BookmarkStatusResponse(bookmarked = false, jobPublicId = jobPublicId))
            .toResponseEntity()
    }

    @Operation(summary = "채용공고 찜 여부 확인", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/jobs/{jobPublicId}/status")
    fun bookmarkStatus(
        @PathVariable jobPublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<BookmarkStatusResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")
        val job = jobRepository.findByPublicId(jobPublicId) ?: throw NotFoundException("Job", jobPublicId)
        val bookmarked = bookmarkRepository.existsBookmark(userId, job.id)
        return ApiResponse.ok(BookmarkStatusResponse(bookmarked = bookmarked, jobPublicId = jobPublicId))
            .toResponseEntity()
    }

    @Operation(summary = "내 찜 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/jobs")
    fun myBookmarks(
        @CurrentUser principal: GadaPrincipal,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<BookmarkedJobsResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")
        val (bookmarks, total) = bookmarkRepository.findJobBookmarksByUser(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = bookmarks.map { bm ->
            val job = bm.job
            val site = job.site
            val company = site?.company
            BookmarkedJobItem(
                bookmarkId = bm.id,
                bookmarkedAt = bm.createdAt,
                publicId = job.publicId,
                title = job.title,
                companyName = company?.name ?: "",
                sido = site?.sido,
                sigungu = site?.sigungu,
                payMin = job.payMin,
                payMax = job.payMax,
                payUnit = job.payUnit.name,
                status = job.status.name,
            )
        }

        return ApiResponse.ok(
            BookmarkedJobsResponse(
                content = content,
                page = page,
                size = size,
                totalElements = total,
                totalPages = totalPages,
                isFirst = page == 0,
                isLast = page >= totalPages - 1,
            )
        ).toResponseEntity()
    }
}
