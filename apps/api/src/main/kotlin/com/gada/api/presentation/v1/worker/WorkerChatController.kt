package com.gada.api.presentation.v1.worker

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.chat.ChatMessage
import com.gada.api.domain.chat.ChatRoom
import com.gada.api.infrastructure.persistence.chat.ChatRepository
import com.gada.api.presentation.v1.employer.ChatMessageResponse
import com.gada.api.presentation.v1.employer.SendMessageRequest
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Worker / Chat", description = "팀장 채팅 (고용주로부터 받은 채팅)")
@RestController
@Transactional
@RequestMapping("/api/v1/worker/chats")
@PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
class WorkerChatController(
    private val chatRepository: ChatRepository,
) {

    @Operation(summary = "받은 채팅방 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms")
    fun listRooms(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<WorkerChatRoomSummary>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (rooms, total) = chatRepository.findRoomsByLeader(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val employerNames = rooms.associate { it.employerId to (chatRepository.findEmployerCompanyName(it.employerId) ?: "고용주") }
        return ApiResponse.ok(PageResponse(
            content = rooms.map { it.toWorkerSummary(userId, employerNames[it.employerId]) },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "채팅방 단건 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/rooms/{roomPublicId}")
    fun getRoom(
        @PathVariable roomPublicId: String,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<WorkerChatRoomSummary>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val room = chatRepository.findRoomByPublicId(UUID.fromString(roomPublicId))
            ?: throw NotFoundException("채팅방")
        if (room.teamLeaderId != userId) throw ForbiddenException()
        val companyName = chatRepository.findEmployerCompanyName(room.employerId)
        return ApiResponse.ok(room.toWorkerSummary(userId, companyName)).toResponseEntity()
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
        if (room.teamLeaderId != userId) throw ForbiddenException()

        room.leaderUnread = 0
        chatRepository.saveRoom(room)

        val (messages, total) = chatRepository.findMessagesByRoom(room.id, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return ApiResponse.ok(PageResponse(
            content = messages.map { ChatMessageResponse(it.publicId.toString(), it.senderId, it.senderId == userId, it.content, it.createdAt) },
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
        if (room.teamLeaderId != userId) throw ForbiddenException()

        val msg = ChatMessage().also {
            it.roomId = room.id
            it.senderId = userId
            it.content = req.content
        }
        val saved = chatRepository.saveMessage(msg)

        room.lastMessageAt = saved.createdAt
        room.lastMessagePreview = req.content.take(100)
        room.employerUnread += 1
        chatRepository.saveRoom(room)

        return ApiResponse.ok(ChatMessageResponse(saved.publicId.toString(), userId, true, saved.content, saved.createdAt))
            .toResponseEntity(HttpStatus.CREATED)
    }
}

// ── Response DTOs ─────────────────────────────────────────────

data class WorkerChatRoomSummary(
    val publicId: String,
    val teamPublicId: String,
    val teamName: String?,
    val employerName: String?,
    val unreadCount: Int,
    val lastMessageAt: Instant?,
    val lastMessagePreview: String?,
    val createdAt: Instant,
)

private fun ChatRoom.toWorkerSummary(viewerId: Long, employerName: String?) = WorkerChatRoomSummary(
    publicId = publicId.toString(),
    teamPublicId = teamPublicId,
    teamName = teamName,
    employerName = employerName,
    unreadCount = if (viewerId == teamLeaderId) leaderUnread else employerUnread,
    lastMessageAt = lastMessageAt,
    lastMessagePreview = lastMessagePreview,
    createdAt = createdAt,
)
