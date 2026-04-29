package com.gada.api.presentation.v1.team

import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.team.TeamWorkSchedule
import com.gada.api.domain.team.WorkScheduleStatus
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import com.gada.api.infrastructure.persistence.team.TeamWorkScheduleRepository
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
import java.time.LocalDate
import java.util.UUID

@Tag(name = "Team / Work Schedules", description = "팀 현장 투입 스케쥴")
@RestController
@Transactional
class TeamWorkScheduleController(
    private val scheduleRepo: TeamWorkScheduleRepository,
    private val teamRepo: TeamRepository,
    private val jobRepo: JobRepository,
) {

    // ── Public: 팀 스케쥴 조회 ──────────────────────────────────────────────────

    @Operation(summary = "팀 스케쥴 조회 (공개)")
    @GetMapping("/api/v1/teams/{teamPublicId}/schedules")
    fun getSchedules(
        @PathVariable teamPublicId: String,
    ): ResponseEntity<ApiResponse<List<WorkScheduleResponse>>> {
        val team = teamRepo.findByPublicId(UUID.fromString(teamPublicId))
            ?: throw NotFoundException("팀")
        val schedules = scheduleRepo.findByTeamId(team.id)
        return ApiResponse.ok(schedules.map { it.toResponse() }).toResponseEntity()
    }

    // ── Auth: 팀장 스케쥴 관리 ──────────────────────────────────────────────────

    @Operation(summary = "스케쥴 등록 (팀장)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/api/v1/teams/{teamPublicId}/schedules")
    @PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
    fun createSchedule(
        @PathVariable teamPublicId: String,
        @Valid @RequestBody req: CreateWorkScheduleRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<WorkScheduleResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val team = teamRepo.findByPublicId(UUID.fromString(teamPublicId))
            ?: throw NotFoundException("팀")
        if (team.leaderId != userId) throw ForbiddenException("팀장만 스케쥴을 등록할 수 있습니다.")

        val schedule = TeamWorkSchedule().also { s ->
            s.teamId = team.id
            s.workDescription = req.workDescription
            s.startDate = LocalDate.parse(req.startDate)
            s.endDate = req.endDate?.let { LocalDate.parse(it) }
            s.status = req.status ?: WorkScheduleStatus.PLANNED.name

            if (req.jobPublicId != null) {
                // 채용공고에서 현장 정보 가져오기 (마감된 것도 허용)
                val job = jobRepo.findByPublicId(UUID.fromString(req.jobPublicId))
                    ?: throw NotFoundException("채용공고")
                s.jobId = job.id
                s.siteName = job.site?.name ?: req.siteName ?: job.title
                s.siteAddress = job.site?.address ?: req.siteAddress
            } else {
                s.siteName = req.siteName ?: throw NotFoundException("현장 이름을 입력해주세요.")
                s.siteAddress = req.siteAddress
            }
        }
        val saved = scheduleRepo.save(schedule)
        return ApiResponse.ok(saved.toResponse()).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "스케쥴 수정 (팀장)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/api/v1/teams/{teamPublicId}/schedules/{schedulePublicId}")
    @PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
    fun updateSchedule(
        @PathVariable teamPublicId: String,
        @PathVariable schedulePublicId: String,
        @Valid @RequestBody req: UpdateWorkScheduleRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<WorkScheduleResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val team = teamRepo.findByPublicId(UUID.fromString(teamPublicId))
            ?: throw NotFoundException("팀")
        if (team.leaderId != userId) throw ForbiddenException()

        val schedule = scheduleRepo.findByPublicId(UUID.fromString(schedulePublicId))
            ?: throw NotFoundException("스케쥴")
        if (schedule.teamId != team.id) throw ForbiddenException()

        req.workDescription?.let { schedule.workDescription = it }
        req.startDate?.let { schedule.startDate = LocalDate.parse(it) }
        req.endDate?.let { schedule.endDate = LocalDate.parse(it) }
        if (req.clearEndDate == true) schedule.endDate = null
        req.status?.let { schedule.status = it }
        req.siteName?.let { schedule.siteName = it }
        req.siteAddress?.let { schedule.siteAddress = it }
        schedule.updatedAt = Instant.now()

        val saved = scheduleRepo.save(schedule)
        return ApiResponse.ok(saved.toResponse()).toResponseEntity()
    }

    @Operation(summary = "스케쥴 삭제 (팀장)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/api/v1/teams/{teamPublicId}/schedules/{schedulePublicId}")
    @PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
    fun deleteSchedule(
        @PathVariable teamPublicId: String,
        @PathVariable schedulePublicId: String,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Unit>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val team = teamRepo.findByPublicId(UUID.fromString(teamPublicId))
            ?: throw NotFoundException("팀")
        if (team.leaderId != userId) throw ForbiddenException()

        val schedule = scheduleRepo.findByPublicId(UUID.fromString(schedulePublicId))
            ?: throw NotFoundException("스케쥴")
        if (schedule.teamId != team.id) throw ForbiddenException()

        scheduleRepo.delete(schedule)
        return ApiResponse.ok(Unit).toResponseEntity()
    }

    // ── Job search for site selection (published + closed, with site info) ──────

    @Operation(summary = "채용공고 현장 검색 (스케쥴 등록용, 마감 포함)")
    @GetMapping("/api/v1/worker/jobs/for-schedule")
    @PreAuthorize("hasAnyRole('WORKER','TEAM_LEADER')")
    fun searchJobsForSchedule(
        @RequestParam(defaultValue = "") keyword: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<List<JobSiteItem>>> {
        val items = jobRepo.findForScheduleSearch(keyword.trim(), page, size)
            .map { job ->
                JobSiteItem(
                    jobPublicId = job.publicId.toString(),
                    jobTitle = job.title,
                    jobStatus = job.status.name,
                    siteName = job.site?.name,
                    siteAddress = job.site?.address,
                    sidoSigungu = listOfNotNull(job.site?.sido, job.site?.sigungu).joinToString(" ").ifBlank { null },
                )
            }
        return ApiResponse.ok(items).toResponseEntity()
    }
}

// ── DTOs ────────────────────────────────────────────────────────────────────────

data class CreateWorkScheduleRequest(
    val jobPublicId: String?,
    val siteName: String?,
    val siteAddress: String?,
    @field:NotBlank @field:Size(max = 500) val workDescription: String,
    @field:NotBlank val startDate: String,   // ISO date string: yyyy-MM-dd
    val endDate: String?,
    val status: String?,
)

data class UpdateWorkScheduleRequest(
    val siteName: String?,
    val siteAddress: String?,
    val workDescription: String?,
    val startDate: String?,
    val endDate: String?,
    val clearEndDate: Boolean?,
    val status: String?,
)

data class WorkScheduleResponse(
    val publicId: String,
    val jobPublicId: String?,
    val siteName: String,
    val siteAddress: String?,
    val workDescription: String,
    val startDate: String,
    val endDate: String?,
    val status: String,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class JobSiteItem(
    val jobPublicId: String,
    val jobTitle: String,
    val jobStatus: String,
    val siteName: String?,
    val siteAddress: String?,
    val sidoSigungu: String?,
)

// ── Mapping ──────────────────────────────────────────────────────────────────────

private fun TeamWorkSchedule.toResponse() = WorkScheduleResponse(
    publicId = publicId.toString(),
    jobPublicId = null, // jobId → publicId lookup omitted for now
    siteName = siteName,
    siteAddress = siteAddress,
    workDescription = workDescription,
    startDate = startDate.toString(),
    endDate = endDate?.toString(),
    status = status,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
