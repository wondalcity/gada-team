package com.gada.api.presentation.v1.employer

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.chat.ChatMessage
import com.gada.api.domain.chat.ChatRoom
import com.gada.api.infrastructure.persistence.chat.ChatRepository
import com.gada.api.infrastructure.persistence.points.PointsRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Employer / Chat", description = "고용주 ↔ 팀장 채팅")
@RestController
@Transactional
@RequestMapping("/api/v1/employer/chats")
@PreAuthorize("hasRole('EMPLOYER')")
class ChatController(
    private val chatRepository: ChatRepository,
    private val pointsRepository: PointsRepository,
) {

    @Operation(summary = "채팅방 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms")
    fun listRooms(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<ChatRoomSummary>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (rooms, total) = chatRepository.findRoomsByEmployer(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(PageResponse(
            content = rooms.map { it.toSummary(userId) },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "채팅방 열기 (없으면 생성, 포인트 차감)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/rooms")
    fun openRoom(
        @Valid @RequestBody req: OpenChatRoomRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ChatRoomDetail>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        // Find existing room
        val existing = chatRepository.findRoomByEmployerAndTeam(userId, req.teamPublicId)
        if (existing != null) {
            existing.employerUnread = 0
            chatRepository.saveRoom(existing)
            return ApiResponse.ok(existing.toDetail(userId)).toResponseEntity()
        }

        // Deduct 1 point for new chat
        val account = pointsRepository.findOrCreateAccount(userId)
        if (!account.hasBalance) {
            throw BusinessException("포인트 잔액이 부족합니다. 포인트를 충전해 주세요.", "INSUFFICIENT_POINTS")
        }
        account.deductPoint()
        pointsRepository.saveAccount(account)

        // Lookup team info
        val teamInfo = chatRepository.findTeamInfo(req.teamPublicId)
            ?: throw NotFoundException("팀")

        val room = ChatRoom().also {
            it.employerId = userId
            it.teamPublicId = req.teamPublicId
            it.teamLeaderId = teamInfo.second
            it.teamName = teamInfo.third
        }
        val saved = chatRepository.saveRoom(room)
        return ApiResponse.ok(saved.toDetail(userId)).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "채팅방 단건 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms/{roomPublicId}")
    fun getRoom(
        @PathVariable roomPublicId: String,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ChatRoomSummary>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val room = chatRepository.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.employerId != userId) throw ForbiddenException()
        return ApiResponse.ok(room.toSummary(userId)).toResponseEntity()
    }

    @Operation(summary = "메시지 목록 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms/{roomPublicId}/messages")
    fun getMessages(
        @PathVariable roomPublicId: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<ChatMessageResponse>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val room = chatRepository.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.employerId != userId) throw ForbiddenException()

        // Reset unread
        room.employerUnread = 0
        chatRepository.saveRoom(room)

        val (messages, total) = chatRepository.findMessagesByRoom(room.id, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(PageResponse(
            content = messages.map { it.toResponse(userId) },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "메시지 전송", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/rooms/{roomPublicId}/messages")
    fun sendMessage(
        @PathVariable roomPublicId: String,
        @Valid @RequestBody req: SendMessageRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ChatMessageResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val room = chatRepository.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.employerId != userId) throw ForbiddenException()

        val msg = ChatMessage().also {
            it.roomId = room.id
            it.senderId = userId
            it.content = req.content
        }
        val saved = chatRepository.saveMessage(msg)

        // Update room summary
        room.lastMessageAt = saved.createdAt
        room.lastMessagePreview = req.content.take(100)
        room.leaderUnread += 1
        chatRepository.saveRoom(room)

        return ApiResponse.ok(saved.toResponse(userId)).toResponseEntity(HttpStatus.CREATED)
    }
}

// ── Request DTOs ─────────────────────────────────────────────

data class OpenChatRoomRequest(
    @field:NotBlank val teamPublicId: String,
)

data class SendMessageRequest(
    @field:NotBlank val content: String,
)

// ── Response DTOs ─────────────────────────────────────────────

data class ChatRoomSummary(
    val publicId: String,
    val teamPublicId: String,
    val teamName: String?,
    val unreadCount: Int,
    val lastMessageAt: Instant?,
    val lastMessagePreview: String?,
    val createdAt: Instant,
)

data class ChatRoomDetail(
    val publicId: String,
    val teamPublicId: String,
    val teamName: String?,
    val pointsUsed: Int,
    val createdAt: Instant,
)

data class ChatMessageResponse(
    val publicId: String,
    val senderId: Long,
    val isMine: Boolean,
    val content: String,
    val createdAt: Instant,
)

// ── Mapping ──────────────────────────────────────────────────

private fun ChatRoom.toSummary(viewerId: Long) = ChatRoomSummary(
    publicId = publicId.toString(),
    teamPublicId = teamPublicId,
    teamName = teamName,
    unreadCount = if (viewerId == employerId) employerUnread else leaderUnread,
    lastMessageAt = lastMessageAt,
    lastMessagePreview = lastMessagePreview,
    createdAt = createdAt,
)

@Suppress("UNUSED_PARAMETER")
private fun ChatRoom.toDetail(viewerId: Long) = ChatRoomDetail(
    publicId = publicId.toString(),
    teamPublicId = teamPublicId,
    teamName = teamName,
    pointsUsed = pointsUsed,
    createdAt = createdAt,
)

private fun ChatMessage.toResponse(viewerId: Long) = ChatMessageResponse(
    publicId = publicId.toString(),
    senderId = senderId,
    isMine = senderId == viewerId,
    content = content,
    createdAt = createdAt,
)
