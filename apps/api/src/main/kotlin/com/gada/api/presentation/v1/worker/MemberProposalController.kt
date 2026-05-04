package com.gada.api.presentation.v1.worker

import com.gada.api.common.ApiResponse
import com.gada.api.common.PageResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.member.MemberProposal
import com.gada.api.infrastructure.persistence.member.MemberProposalRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Worker / MemberProposal", description = "팀원 제안 (근로자 → 팀장)")
@RestController
@Transactional
@RequestMapping("/api/v1")
@PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
class MemberProposalController(
    private val memberProposalRepository: MemberProposalRepository,
) {

    @Operation(summary = "팀에 팀원 제안 보내기", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/teams/{teamPublicId}/member-proposals")
    fun sendProposal(
        @PathVariable teamPublicId: String,
        @Valid @RequestBody req: SendMemberProposalRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<MemberProposalResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        if (memberProposalRepository.existsByTeamAndProposer(teamPublicId, userId)) {
            throw ConflictException("이미 해당 팀에 제안을 보냈습니다.", "PROPOSAL_ALREADY_EXISTS")
        }

        val leaderId = memberProposalRepository.findTeamLeaderId(teamPublicId)
            ?: throw NotFoundException("팀")

        val proposal = MemberProposal().also {
            it.teamPublicId = teamPublicId
            it.teamLeaderId = leaderId
            it.proposerId = userId
            it.message = req.message
        }
        val saved = memberProposalRepository.save(proposal)
        val name = memberProposalRepository.findProposerName(userId)
        val pid = memberProposalRepository.findProposerPublicId(userId)
        return ApiResponse.ok(saved.toResponse(name, pid)).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "내가 보낸 팀원 제안 목록", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/worker/member-proposals/sent")
    fun mySentProposals(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<MemberProposalResponse>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (proposals, total) = memberProposalRepository.findByProposer(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val teamNames = proposals.associate { it.teamPublicId to memberProposalRepository.findTeamName(it.teamPublicId) }
        return ApiResponse.ok(PageResponse(
            content = proposals.map { it.toResponse(null, null, teamNames[it.teamPublicId]) },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "받은 팀원 제안 목록 (팀장용)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/teams/mine/member-proposals")
    fun receivedProposals(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<MemberProposalResponse>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val (proposals, total) = memberProposalRepository.findByLeader(userId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val names = proposals.associate { it.proposerId to memberProposalRepository.findProposerName(it.proposerId) }
        val pids = proposals.associate { it.proposerId to memberProposalRepository.findProposerPublicId(it.proposerId) }
        val teamNames = proposals.associate { it.teamPublicId to memberProposalRepository.findTeamName(it.teamPublicId) }
        return ApiResponse.ok(PageResponse(
            content = proposals.map { it.toResponse(names[it.proposerId], pids[it.proposerId], teamNames[it.teamPublicId]) },
            page = page, size = size, totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "팀원 제안 수락/거절 (팀장용)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/teams/mine/member-proposals/{proposalPublicId}")
    fun respondToProposal(
        @PathVariable proposalPublicId: String,
        @Valid @RequestBody req: RespondProposalRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<MemberProposalResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val proposal = memberProposalRepository.findByPublicId(UUID.fromString(proposalPublicId))
            ?: throw NotFoundException("제안")
        if (proposal.teamLeaderId != userId) throw ForbiddenException()
        if (proposal.status != "PENDING") throw BusinessException("이미 처리된 제안입니다.", "ALREADY_RESPONDED")

        proposal.status = req.status
        proposal.respondedAt = Instant.now()
        val saved = memberProposalRepository.save(proposal)
        val name = memberProposalRepository.findProposerName(proposal.proposerId)
        val pid = memberProposalRepository.findProposerPublicId(proposal.proposerId)
        val teamName = memberProposalRepository.findTeamName(proposal.teamPublicId)
        return ApiResponse.ok(saved.toResponse(name, pid, teamName)).toResponseEntity()
    }
}

// ── Request DTOs ─────────────────────────────────────────────

data class SendMemberProposalRequest(
    val message: String? = null,
)

data class RespondProposalRequest(
    @field:Pattern(regexp = "ACCEPTED|DECLINED")
    @field:NotBlank val status: String,
)

// ── Response DTOs ─────────────────────────────────────────────

data class MemberProposalResponse(
    val publicId: String,
    val teamPublicId: String,
    val teamName: String?,
    val proposerName: String?,
    val proposerPublicId: String?,
    val message: String?,
    val status: String,
    val respondedAt: Instant?,
    val createdAt: Instant,
)

private fun MemberProposal.toResponse(proposerName: String?, proposerPublicId: java.util.UUID?, teamName: String? = null) = MemberProposalResponse(
    publicId = publicId.toString(),
    teamPublicId = teamPublicId,
    teamName = teamName,
    proposerName = proposerName,
    proposerPublicId = proposerPublicId?.toString(),
    message = message,
    status = status,
    respondedAt = respondedAt,
    createdAt = createdAt,
)
