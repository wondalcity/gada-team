package com.gada.api.presentation.v1.team

import com.gada.api.application.team.TeamUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
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
import org.springframework.web.bind.annotation.*
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Teams", description = "팀 관리")
@RestController
@RequestMapping("/api/v1/teams")
class TeamController(private val teamUseCase: TeamUseCase) {

    @Operation(summary = "팀 생성", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping
    fun createTeam(
        @Valid @RequestBody req: CreateTeamRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<TeamResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.createTeam(userId, req)).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "팀 목록 (공개)")
    @GetMapping
    fun listTeams(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) sido: String?,
        @RequestParam(required = false) teamType: String?,
        @RequestParam(required = false) isNationwide: Boolean?,
    ): ResponseEntity<ApiResponse<PageResponse<TeamListItem>>> {
        val teamTypeEnum = teamType?.let {
            runCatching { com.gada.api.domain.team.TeamType.valueOf(it) }.getOrNull()
        }
        val (items, total) = teamUseCase.listTeams(
            page, size,
            keyword = keyword,
            sido = sido,
            teamType = teamTypeEnum,
            isNationwide = isNationwide,
        )
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val resp = PageResponse(
            content = items, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )
        return ApiResponse.ok(resp).toResponseEntity()
    }

    @Operation(summary = "내 팀 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/mine")
    fun getMyTeam(@CurrentUser principal: GadaPrincipal): ResponseEntity<ApiResponse<TeamResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.getMyTeam(userId)).toResponseEntity()
    }

    @Operation(summary = "내가 팀장인 팀 목록 조회", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/led-by-me")
    fun getLeadedTeams(@CurrentUser principal: GadaPrincipal): ResponseEntity<ApiResponse<List<TeamResponse>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.getLeadedTeams(userId)).toResponseEntity()
    }

    @Operation(summary = "팀 상세 조회 (공개)")
    @GetMapping("/{publicId}")
    fun getTeam(@PathVariable publicId: UUID): ResponseEntity<ApiResponse<TeamResponse>> =
        ApiResponse.ok(teamUseCase.getTeamDetail(publicId)).toResponseEntity()

    @Operation(summary = "팀 수정", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/{publicId}")
    fun updateTeam(
        @PathVariable publicId: UUID,
        @Valid @RequestBody req: UpdateTeamRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<TeamResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.updateTeam(userId, publicId, req)).toResponseEntity()
    }

    @Operation(summary = "팀 해산", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/{publicId}")
    fun disbandTeam(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        teamUseCase.disbandTeam(userId, publicId)
        return ApiResponse.noContent().toResponseEntity(HttpStatus.NO_CONTENT)
    }

    @Operation(summary = "멤버 초대 (전화번호)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/{publicId}/invitations")
    fun inviteMember(
        @PathVariable publicId: UUID,
        @Valid @RequestBody req: InviteMemberRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PhoneInviteResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = teamUseCase.inviteMember(userId, publicId, req)
        val status = if (result.type == "INVITED") HttpStatus.CREATED else HttpStatus.OK
        return ApiResponse.ok(result).toResponseEntity(status)
    }

    @Operation(summary = "프로필로 멤버 초대", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/{publicId}/invitations/by-profile")
    fun inviteMemberByProfile(
        @PathVariable publicId: UUID,
        @Valid @RequestBody req: InviteByProfileRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<TeamMemberResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(teamUseCase.inviteMemberByProfile(userId, publicId, req)).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "멤버 제거", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/{publicId}/members/{userId}")
    fun removeMember(
        @PathVariable publicId: UUID,
        @PathVariable userId: Long,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val callerId = principal.userId ?: throw UnauthorizedException()
        teamUseCase.removeMember(callerId, publicId, userId)
        return ApiResponse.noContent().toResponseEntity(HttpStatus.NO_CONTENT)
    }
}
