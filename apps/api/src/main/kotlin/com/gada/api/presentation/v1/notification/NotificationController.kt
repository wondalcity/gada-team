package com.gada.api.presentation.v1.notification

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.notification.Notification
import com.gada.api.domain.notification.NotificationType
import com.gada.api.infrastructure.persistence.notification.NotificationRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

@Tag(name = "Notifications", description = "알림 관리")
@RestController
class NotificationController(
    private val notificationRepository: NotificationRepository,
) {

    @Operation(summary = "내 알림 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/api/v1/notifications")
    fun getMyNotifications(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<NotificationListResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (content, total) = notificationRepository.findAll(userId = userId, page = page, size = size)
        val unreadCount = notificationRepository.countUnread(userId)
        return ApiResponse.ok(
            NotificationListResponse(
                content = content.map { it.toItem() },
                page = page,
                size = size,
                totalElements = total,
                totalPages = ((total + size - 1) / size).toInt(),
                unreadCount = unreadCount,
            )
        ).toResponseEntity()
    }

    @Operation(summary = "알림 읽음 처리", security = [SecurityRequirement(name = "Bearer")])
    @Transactional
    @PatchMapping("/api/v1/notifications/{publicId}/read")
    fun markRead(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<NotificationItem>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val notification = notificationRepository.findByPublicId(publicId)
            ?: throw com.gada.api.common.exception.NotFoundException("알림을 찾을 수 없습니다.")
        if (notification.userId != userId) throw UnauthorizedException()
        notification.markRead()
        notificationRepository.save(notification)
        return ApiResponse.ok(notification.toItem()).toResponseEntity()
    }

    @Operation(summary = "모든 알림 읽음 처리", security = [SecurityRequirement(name = "Bearer")])
    @Transactional
    @PatchMapping("/api/v1/notifications/read-all")
    fun markAllRead(
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (content, _) = notificationRepository.findAll(userId = userId, page = 0, size = 200)
        content.filter { !it.isRead }.forEach { n ->
            n.markRead()
            notificationRepository.save(n)
        }
        return ApiResponse.noContent().toResponseEntity()
    }
}

// ─── Response types ───────────────────────────────────────────

data class NotificationListResponse(
    val content: List<NotificationItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val unreadCount: Long,
)

data class NotificationItem(
    val publicId: UUID,
    val type: NotificationType,
    val title: String,
    val body: String,
    val data: Map<String, Any>,
    val isRead: Boolean,
    val readAt: Instant?,
    val createdAt: Instant,
)

private fun Notification.toItem() = NotificationItem(
    publicId = publicId,
    type = type,
    title = title,
    body = body,
    data = data,
    isRead = isRead,
    readAt = readAt,
    createdAt = createdAt,
)
