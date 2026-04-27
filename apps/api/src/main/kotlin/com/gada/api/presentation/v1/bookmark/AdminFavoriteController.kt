package com.gada.api.presentation.v1.bookmark

import com.gada.api.common.AdminPermission
import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.bookmark.AdminFavorite
import com.gada.api.domain.bookmark.AdminFavoriteTarget
import com.gada.api.infrastructure.persistence.bookmark.BookmarkRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import com.gada.api.presentation.v1.admin.AdminTeamItem
import com.gada.api.presentation.v1.admin.AdminWorkerItem
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

// ─── Request / Response ───────────────────────────────────────────────────────

data class AddFavoriteRequest(
    val targetType: AdminFavoriteTarget,
    val targetPublicId: UUID,
    @field:Size(max = 500) val note: String? = null,
)

data class FavoriteWorkerItem(
    val favoriteId: Long,
    val userId: Long,
    val publicId: UUID,
    val phone: String,
    val fullName: String?,
    val nationality: String?,
    val visaType: String?,
    val role: String,
    val status: String,
    val note: String?,
    val favoritedAt: Instant,
)

data class FavoriteTeamItem(
    val favoriteId: Long,
    val publicId: UUID,
    val name: String,
    val teamType: String,
    val leaderId: Long,
    val memberCount: Int,
    val status: String,
    val isNationwide: Boolean,
    val note: String?,
    val favoritedAt: Instant,
)

data class AdminFavoritesResponse(
    val workers: List<FavoriteWorkerItem>,
    val teams: List<FavoriteTeamItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class FavoriteStatusResponse(val favorited: Boolean, val targetPublicId: UUID)

// ─── Controller ───────────────────────────────────────────────────────────────

@Tag(name = "AdminFavorites", description = "관리자 근로자/팀 찜")
@RestController
@Transactional
@RequestMapping("/api/v1/admin/favorites")
class AdminFavoriteController(
    private val bookmarkRepository: BookmarkRepository,
    private val userRepository: UserRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val teamRepository: TeamRepository,
    private val adminPermission: AdminPermission,
) {

    @Operation(summary = "찜 추가 (근로자 또는 팀)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun addFavorite(
        @RequestBody req: AddFavoriteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<FavoriteStatusResponse>> {
        val adminId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")
        val admin = userRepository.findById(adminId) ?: throw UnauthorizedException("사용자를 찾을 수 없습니다.")

        val favorite = AdminFavorite().also { f ->
            f.admin = admin
            f.targetType = req.targetType
            f.note = req.note
        }

        when (req.targetType) {
            AdminFavoriteTarget.WORKER -> {
                val target = userRepository.findByPublicId(req.targetPublicId)
                    ?: throw NotFoundException("Worker", req.targetPublicId)
                if (bookmarkRepository.findAdminFavorite(adminId, target.id, null) != null) {
                    throw ConflictException("이미 찜한 근로자입니다.", "ALREADY_FAVORITED")
                }
                favorite.targetWorker = target
            }
            AdminFavoriteTarget.TEAM -> {
                val target = teamRepository.findByPublicId(req.targetPublicId)
                    ?: throw NotFoundException("Team", req.targetPublicId)
                if (bookmarkRepository.findAdminFavorite(adminId, null, target.id) != null) {
                    throw ConflictException("이미 찜한 팀입니다.", "ALREADY_FAVORITED")
                }
                favorite.targetTeam = target
            }
        }

        bookmarkRepository.saveFavorite(favorite)
        return ApiResponse.ok(FavoriteStatusResponse(favorited = true, targetPublicId = req.targetPublicId))
            .toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "찜 취소", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/{targetType}/{targetPublicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun removeFavorite(
        @PathVariable targetType: AdminFavoriteTarget,
        @PathVariable targetPublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<FavoriteStatusResponse>> {
        val adminId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")

        val favorite = when (targetType) {
            AdminFavoriteTarget.WORKER -> {
                val target = userRepository.findByPublicId(targetPublicId)
                    ?: throw NotFoundException("Worker", targetPublicId)
                bookmarkRepository.findAdminFavorite(adminId, target.id, null)
                    ?: throw NotFoundException("Favorite", targetPublicId)
            }
            AdminFavoriteTarget.TEAM -> {
                val target = teamRepository.findByPublicId(targetPublicId)
                    ?: throw NotFoundException("Team", targetPublicId)
                bookmarkRepository.findAdminFavorite(adminId, null, target.id)
                    ?: throw NotFoundException("Favorite", targetPublicId)
            }
        }

        bookmarkRepository.deleteFavorite(favorite)
        return ApiResponse.ok(FavoriteStatusResponse(favorited = false, targetPublicId = targetPublicId))
            .toResponseEntity()
    }

    @Operation(summary = "찜 목록 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun getFavorites(
        @CurrentUser principal: GadaPrincipal,
        @RequestParam(required = false) targetType: AdminFavoriteTarget?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<AdminFavoritesResponse>> {
        val adminId = principal.userId ?: throw UnauthorizedException("로그인이 필요합니다.")
        val (favorites, total) = bookmarkRepository.findAdminFavorites(adminId, targetType, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val workers = mutableListOf<FavoriteWorkerItem>()
        val teams = mutableListOf<FavoriteTeamItem>()

        favorites.forEach { fav ->
            when (fav.targetType) {
                AdminFavoriteTarget.WORKER -> {
                    val u = fav.targetWorker ?: return@forEach
                    val wp = workerProfileRepository.findByUserId(u.id)
                    workers.add(FavoriteWorkerItem(
                        favoriteId = fav.id,
                        userId = u.id,
                        publicId = u.publicId,
                        phone = u.phone,
                        fullName = wp?.fullName,
                        nationality = wp?.nationality,
                        visaType = wp?.visaType?.name,
                        role = u.role.name,
                        status = u.status.name,
                        note = fav.note,
                        favoritedAt = fav.createdAt,
                    ))
                }
                AdminFavoriteTarget.TEAM -> {
                    val t = fav.targetTeam ?: return@forEach
                    teams.add(FavoriteTeamItem(
                        favoriteId = fav.id,
                        publicId = t.publicId,
                        name = t.name,
                        teamType = t.teamType.name,
                        leaderId = t.leaderId,
                        memberCount = t.memberCount,
                        status = t.status.name,
                        isNationwide = t.isNationwide,
                        note = fav.note,
                        favoritedAt = fav.createdAt,
                    ))
                }
            }
        }

        return ApiResponse.ok(
            AdminFavoritesResponse(
                workers = workers,
                teams = teams,
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
