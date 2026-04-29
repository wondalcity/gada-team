package com.gada.api.presentation.v1.worker

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.chat.DirectChatMessage
import com.gada.api.domain.chat.DirectChatRoom
import com.gada.api.domain.notification.Notification
import com.gada.api.domain.notification.NotificationType
import com.gada.api.infrastructure.persistence.chat.DirectChatRepository
import com.gada.api.infrastructure.persistence.notification.NotificationRepository
import com.gada.api.infrastructure.persistence.points.PointsRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Worker / Direct Chat", description = "근로자 간 1:1 직접 채팅")
@RestController
@Transactional
@RequestMapping("/api/v1/worker/direct-chats")
@PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
class DirectChatController(
    private val directChatRepo: DirectChatRepository,
    private val pointsRepository: PointsRepository,
    private val notificationRepository: NotificationRepository,
) {

    @Operation(summary = "채팅방 열기 (없으면 생성)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/open")
    fun openRoom(
        @RequestParam workerProfilePublicId: String,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<DirectChatRoomResponse>> {
        val myId = principal.userId ?: throw UnauthorizedException()

        val targetUserId = directChatRepo.findUserIdByWorkerProfilePublicId(workerProfilePublicId)
            ?: throw NotFoundException("Worker profile", workerProfilePublicId)

        if (myId == targetUserId) throw ForbiddenException("자기 자신과 채팅할 수 없습니다.")

        val existing = directChatRepo.findRoomBetween(myId, targetUserId)
        if (existing != null) {
            val myName = directChatRepo.findWorkerName(myId)
            val otherName = directChatRepo.findWorkerName(targetUserId)
            val myImage = directChatRepo.findWorkerProfileImageUrl(myId)
            val otherImage = directChatRepo.findWorkerProfileImageUrl(targetUserId)
            return ApiResponse.ok(existing.toResponse(myId, myName, otherName, myImage, otherImage)).toResponseEntity()
        }

        // TEAM_LEADER 역할인 경우 새 채팅 개시 시 포인트 1점 차감
        if (principal.role == "TEAM_LEADER") {
            val account = pointsRepository.findOrCreateTeamLeaderAccount(myId)
            if (!account.hasBalance) {
                throw BusinessException("포인트 잔액이 부족합니다. 포인트를 충전해 주세요.", "INSUFFICIENT_POINTS")
            }
            account.deductPoint()
            pointsRepository.saveTeamLeaderAccount(account)
        }

        val room = DirectChatRoom().also {
            it.senderId = myId
            it.recipientId = targetUserId
        }
        val saved = directChatRepo.saveRoom(room)

        val myName = directChatRepo.findWorkerName(myId)
        val otherName = directChatRepo.findWorkerName(targetUserId)
        val myImage = directChatRepo.findWorkerProfileImageUrl(myId)
        val otherImage = directChatRepo.findWorkerProfileImageUrl(targetUserId)

        // Notify recipient of new chat room
        runCatching {
            val notif = Notification().apply {
                this.userId = targetUserId
                this.type = NotificationType.CHAT
                this.title = "새 채팅이 도착했습니다"
                this.body = "${myName ?: "누군가"}이(가) 채팅을 시작했습니다."
                this.data = mapOf("chatRoomId" to saved.publicId.toString(), "chatType" to "direct")
            }
            notificationRepository.save(notif)
        }

        return ApiResponse.ok(saved.toResponse(myId, myName, otherName, myImage, otherImage))
            .toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "직접 채팅방 단건 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms/{roomPublicId}")
    fun getRoom(
        @PathVariable roomPublicId: String,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<DirectChatRoomSummary>> {
        val myId = principal.userId ?: throw UnauthorizedException()
        val room = directChatRepo.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.senderId != myId && room.recipientId != myId) throw ForbiddenException()
        val otherId = if (room.senderId == myId) room.recipientId else room.senderId
        val otherName = directChatRepo.findWorkerName(otherId)
        val otherImage = directChatRepo.findWorkerProfileImageUrl(otherId)
        val unread = if (room.senderId == myId) room.senderUnread else room.recipientUnread
        return ApiResponse.ok(DirectChatRoomSummary(
            publicId = room.publicId.toString(),
            otherUserId = otherId,
            otherName = otherName,
            otherProfileImageUrl = otherImage,
            unreadCount = unread,
            lastMessageAt = room.lastMessageAt,
            lastMessagePreview = room.lastMessagePreview,
            createdAt = room.createdAt,
        )).toResponseEntity()
    }

    @Operation(summary = "내 직접 채팅 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms")
    fun listRooms(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<DirectChatRoomSummary>>> {
        val myId = principal.userId ?: throw UnauthorizedException()
        val (rooms, total) = directChatRepo.findRoomsByUser(myId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(PageResponse(
            content = rooms.map { room ->
                val otherId = if (room.senderId == myId) room.recipientId else room.senderId
                val otherName = directChatRepo.findWorkerName(otherId)
                val otherImage = directChatRepo.findWorkerProfileImageUrl(otherId)
                val unread = if (room.senderId == myId) room.senderUnread else room.recipientUnread
                DirectChatRoomSummary(
                    publicId = room.publicId.toString(),
                    otherUserId = otherId,
                    otherName = otherName,
                    otherProfileImageUrl = otherImage,
                    unreadCount = unread,
                    lastMessageAt = room.lastMessageAt,
                    lastMessagePreview = room.lastMessagePreview,
                    createdAt = room.createdAt,
                )
            },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "메시지 목록 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms/{roomPublicId}/messages")
    fun getMessages(
        @PathVariable roomPublicId: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<DirectChatMessageResponse>>> {
        val myId = principal.userId ?: throw UnauthorizedException()
        val room = directChatRepo.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.senderId != myId && room.recipientId != myId) throw ForbiddenException()

        // Mark as read
        if (room.senderId == myId) room.senderUnread = 0
        else room.recipientUnread = 0
        directChatRepo.saveRoom(room)

        val (messages, total) = directChatRepo.findMessagesByRoom(room.id, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val otherId = if (room.senderId == myId) room.recipientId else room.senderId
        val otherName = directChatRepo.findWorkerName(otherId)
        val otherImage = directChatRepo.findWorkerProfileImageUrl(otherId)

        return ApiResponse.ok(PageResponse(
            content = messages.map { DirectChatMessageResponse(it.publicId.toString(), it.senderId, it.senderId == myId, it.content, it.createdAt) },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "메시지 전송", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/rooms/{roomPublicId}/messages")
    fun sendMessage(
        @PathVariable roomPublicId: String,
        @Valid @RequestBody req: DirectSendMessageRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<DirectChatMessageResponse>> {
        val myId = principal.userId ?: throw UnauthorizedException()
        val room = directChatRepo.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.senderId != myId && room.recipientId != myId) throw ForbiddenException()

        val msg = DirectChatMessage().also {
            it.roomId = room.id
            it.senderId = myId
            it.content = req.content
        }
        val saved = directChatRepo.saveMessage(msg)

        room.lastMessageAt = saved.createdAt
        room.lastMessagePreview = req.content.take(100)
        if (room.senderId == myId) room.recipientUnread += 1
        else room.senderUnread += 1
        directChatRepo.saveRoom(room)

        return ApiResponse.ok(DirectChatMessageResponse(saved.publicId.toString(), myId, true, saved.content, saved.createdAt))
            .toResponseEntity(HttpStatus.CREATED)
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class DirectSendMessageRequest(
    @field:NotBlank @field:Size(max = 1000) val content: String,
)

data class DirectChatRoomResponse(
    val publicId: String,
    val myId: Long,
    val otherId: Long,
    val otherName: String?,
    val otherProfileImageUrl: String?,
    val unreadCount: Int,
    val lastMessageAt: Instant?,
    val lastMessagePreview: String?,
    val createdAt: Instant,
)

data class DirectChatRoomSummary(
    val publicId: String,
    val otherUserId: Long,
    val otherName: String?,
    val otherProfileImageUrl: String?,
    val unreadCount: Int,
    val lastMessageAt: Instant?,
    val lastMessagePreview: String?,
    val createdAt: Instant,
)

data class DirectChatMessageResponse(
    val publicId: String,
    val senderId: Long,
    val isMine: Boolean,
    val content: String,
    val createdAt: Instant,
)

private fun DirectChatRoom.toResponse(
    myId: Long,
    myName: String?,
    otherName: String?,
    myImage: String?,
    otherImage: String?,
) = DirectChatRoomResponse(
    publicId = publicId.toString(),
    myId = myId,
    otherId = if (senderId == myId) recipientId else senderId,
    otherName = otherName,
    otherProfileImageUrl = otherImage,
    unreadCount = if (senderId == myId) senderUnread else recipientUnread,
    lastMessageAt = lastMessageAt,
    lastMessagePreview = lastMessagePreview,
    createdAt = createdAt,
)
