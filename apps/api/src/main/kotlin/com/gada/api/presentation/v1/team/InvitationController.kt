package com.gada.api.presentation.v1.team

import com.gada.api.application.team.TeamUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@Tag(name = "Invitations", description = "팀 초대 관리")
@RestController
@RequestMapping("/api/v1/invitations")
class InvitationController(private val teamUseCase: TeamUseCase) {

    @Operation(summary = "내 초대 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/mine")
    fun getMyInvitations(@CurrentUser principal: GadaPrincipal): ResponseEntity<ApiResponse<List<InvitationResponse>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.getMyInvitations(userId)).toResponseEntity()
    }

    @Operation(summary = "초대 수락", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/{id}/accept")
    fun acceptInvitation(
        @PathVariable id: Long,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<InvitationResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.acceptInvitation(userId, id)).toResponseEntity()
    }

    @Operation(summary = "초대 거절", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/{id}/reject")
    fun rejectInvitation(
        @PathVariable id: Long,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<InvitationResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.rejectInvitation(userId, id)).toResponseEntity()
    }
}
