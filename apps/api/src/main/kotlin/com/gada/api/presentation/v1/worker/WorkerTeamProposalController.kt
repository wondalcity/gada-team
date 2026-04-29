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
import com.gada.api.application.application.ApplicationUseCase
import com.gada.api.domain.points.TeamProposal
import com.gada.api.infrastructure.persistence.points.PointsRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Worker / TeamProposal", description = "팀장이 고용주로부터 받은 채용 제안 관리")
@RestController
@Transactional
@RequestMapping("/api/v1/worker/teams/proposals")
@PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
class WorkerTeamProposalController(
    private val pointsRepository: PointsRepository,
    private val teamRepository: TeamRepository,
    private val applicationUseCase: ApplicationUseCase,
) {

    @Operation(summary = "받은 채용 제안 목록 (팀장용)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping
    fun listReceivedProposals(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) teamPublicId: String?,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<PageResponse<WorkerTeamProposalItem>>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        val teams = teamRepository.findAllByLeaderId(userId)
        if (teams.isEmpty()) {
            return ApiResponse.ok(
                PageResponse(
                    content = emptyList<WorkerTeamProposalItem>(),
                    page = page,
                    size = size,
                    totalElements = 0L,
                    totalPages = 0,
                    isFirst = true,
                    isLast = true,
                )
            ).toResponseEntity()
        }

        val allTeamPublicIds = teams.map { it.publicId.toString() }

        // If a specific team is requested, verify the caller is its leader
        val targetIds = if (teamPublicId != null) {
            if (teamPublicId !in allTeamPublicIds) throw ForbiddenException()
            listOf(teamPublicId)
        } else {
            allTeamPublicIds
        }

        val (proposals, total) = pointsRepository.findProposalsByTeamPublicIds(targetIds, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return ApiResponse.ok(
            PageResponse(
                content = proposals.map { it.toWorkerItem() },
                page = page,
                size = size,
                totalElements = total,
                totalPages = totalPages,
                isFirst = page == 0,
                isLast = page >= totalPages - 1,
            )
        ).toResponseEntity()
    }

    @Operation(summary = "채용 제안 수락/거절 (팀장용)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/{proposalPublicId}")
    fun respondToProposal(
        @PathVariable proposalPublicId: String,
        @Valid @RequestBody req: RespondTeamProposalRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<WorkerTeamProposalItem>> {
        val userId = principal.userId ?: throw UnauthorizedException()

        val teams = teamRepository.findAllByLeaderId(userId)
        if (teams.isEmpty()) throw NotFoundException("팀 — 팀장만 응답할 수 있습니다.")

        val proposal = pointsRepository.findProposalByPublicId(UUID.fromString(proposalPublicId))
            ?: throw NotFoundException("제안")

        val teamPublicIds = teams.map { it.publicId.toString() }
        if (proposal.teamPublicId !in teamPublicIds) throw ForbiddenException()

        if (proposal.status != "PENDING") {
            throw BusinessException("이미 처리된 제안입니다.", "ALREADY_RESPONDED")
        }

        proposal.status = req.status
        proposal.respondedAt = Instant.now()
        val saved = pointsRepository.saveProposal(proposal)

        // 수락 시 해당 채용 공고에 팀 자동 지원
        if (req.status == "ACCEPTED") {
            try {
                applicationUseCase.applyForJob(
                    userId = userId,
                    jobPublicId = UUID.fromString(proposal.jobPublicId),
                    applicationType = "TEAM",
                    teamPublicId = UUID.fromString(proposal.teamPublicId),
                    coverLetter = null,
                )
            } catch (e: BusinessException) {
                // 이미 해당 팀으로 지원된 경우 무시
                if (e.errorCode != "ALREADY_APPLIED") throw e
            }
        }

        return ApiResponse.ok(saved.toWorkerItem()).toResponseEntity()
    }
}

// ── Request DTO ──────────────────────────────────────────────

data class RespondTeamProposalRequest(
    @field:Pattern(regexp = "ACCEPTED|DECLINED")
    @field:NotBlank val status: String,
)

// ── Response DTO ─────────────────────────────────────────────

data class WorkerTeamProposalItem(
    val publicId: String,
    val teamPublicId: String,
    val jobPublicId: String,
    val jobTitle: String?,
    val message: String?,
    val status: String,
    val respondedAt: Instant?,
    val createdAt: Instant,
)

private fun TeamProposal.toWorkerItem() = WorkerTeamProposalItem(
    publicId = publicId.toString(),
    teamPublicId = teamPublicId,
    jobPublicId = jobPublicId,
    jobTitle = jobTitle,
    message = message,
    status = status,
    respondedAt = respondedAt,
    createdAt = createdAt,
)
