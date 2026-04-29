package com.gada.api.application.application

import com.gada.api.application.audit.AuditService
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.domain.application.Application
import com.gada.api.domain.application.ApplicationStatus
import com.gada.api.domain.application.ApplicationType
import com.gada.api.domain.application.CompanySnapshot
import com.gada.api.domain.application.TeamSnapshot
import com.gada.api.domain.application.WorkerSnapshot
import com.gada.api.domain.job.JobStatus
import com.gada.api.domain.notification.Notification
import com.gada.api.domain.notification.NotificationType
import com.gada.api.infrastructure.persistence.application.ApplicationRepository
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.notification.NotificationRepository
import com.gada.api.infrastructure.persistence.team.TeamMemberRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import com.gada.api.infrastructure.persistence.user.EmployerProfileRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@Service
@Transactional
class ApplicationUseCase(
    private val applicationRepository: ApplicationRepository,
    private val jobRepository: JobRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val teamRepository: TeamRepository,
    private val teamMemberRepository: TeamMemberRepository,
    private val employerProfileRepository: EmployerProfileRepository,
    private val auditService: AuditService,
    private val notificationRepository: NotificationRepository,
) {

    fun applyForJob(
        userId: Long,
        jobPublicId: UUID,
        applicationType: String,
        teamPublicId: UUID?,
        coverLetter: String?,
    ): ApplicationDetailResponse {
        val job = jobRepository.findByPublicId(jobPublicId)
            ?: throw NotFoundException("Job", jobPublicId)

        if (job.status != JobStatus.PUBLISHED) {
            throw NotFoundException("Job", jobPublicId)
        }

        val appType = runCatching { ApplicationType.valueOf(applicationType) }.getOrElse {
            throw BusinessException("잘못된 지원 유형입니다: $applicationType", "INVALID_APPLICATION_TYPE")
        }

        // Duplicate check for individual application
        if (appType == ApplicationType.INDIVIDUAL) {
            val existingIndividual = applicationRepository.findByJobIdAndApplicantUserId(job.id, userId)
            if (existingIndividual != null) {
                throw BusinessException("이미 지원한 공고입니다", "ALREADY_APPLIED")
            }
        }

        val profile = workerProfileRepository.findByUserId(userId)
            ?: throw NotFoundException("WorkerProfile for user", userId)

        val workerSnapshot = WorkerSnapshot(
            fullName = profile.fullName,
            birthDate = profile.birthDate.toString(),
            nationality = profile.nationality,
            visaType = profile.visaType.name,
            healthCheckStatus = profile.healthCheckStatus.name,
            healthCheckExpiry = profile.healthCheckExpiry?.toString(),
            languages = profile.languages.map { mapOf("code" to it.code, "level" to it.level) },
            certifications = profile.certifications.map { mapOf("code" to it.code, "name" to it.name) },
            portfolio = profile.portfolio.map { mapOf("title" to it.title, "description" to (it.description ?: "")) },
            desiredPayMin = profile.desiredPayMin,
            desiredPayMax = profile.desiredPayMax,
            desiredPayUnit = profile.desiredPayUnit?.name,
            profileImageUrl = profile.profileImageUrl,
        )

        val application = Application().apply {
            this.jobId = job.id
            this.applicationType = appType
            // INDIVIDUAL: set applicantUserId; TEAM: leave null (DB constraint requires it)
            this.applicantUserId = if (appType == ApplicationType.INDIVIDUAL) userId else null
            this.coverLetter = coverLetter
            this.workerSnapshot = workerSnapshot
        }

        if (appType == ApplicationType.TEAM) {
            val tPublicId = teamPublicId
                ?: throw BusinessException("팀 지원 시 teamPublicId가 필요합니다", "TEAM_PUBLIC_ID_REQUIRED")

            val team = teamRepository.findByPublicId(tPublicId)
                ?: throw NotFoundException("Team", tPublicId)

            // Verify caller is leader or active member
            val isLeader = team.leaderId == userId
            val isMember = teamMemberRepository.findActiveByTeamId(team.id)
                .any { it.userId == userId }

            if (!isLeader && !isMember) {
                throw ForbiddenException("해당 팀의 멤버가 아닙니다")
            }

            // Duplicate check for team application
            val existingTeam = applicationRepository.findByJobIdAndTeamId(job.id, team.id)
            if (existingTeam != null) {
                throw BusinessException("이미 이 팀으로 지원한 공고입니다", "ALREADY_APPLIED")
            }

            application.teamId = team.id
            application.teamSnapshot = TeamSnapshot(
                name = team.name,
                type = team.teamType.name,
                description = team.introShort,
                memberCount = team.memberCount,
                regions = team.regions.map { mapOf("sido" to it.sido, "sigungu" to it.sigungu) },
                desiredPayMin = team.desiredPayMin,
                desiredPayMax = team.desiredPayMax,
                desiredPayUnit = team.desiredPayUnit,
                coverImageUrl = team.coverImageUrl,
            )
        }

        val saved = applicationRepository.save(application)
        auditService.record("APPLICATION", saved.id, "APPLICATION_CREATED", actorId = userId, actorRole = "WORKER")

        return saved.toDetail(job.title, job.publicId, job.company?.name ?: "")
    }

    @Transactional(readOnly = true)
    fun getMyApplications(userId: Long, page: Int, size: Int): ApplicationListResponse {
        // 팀 지원도 포함: 사용자가 팀장 또는 활성 멤버인 팀의 지원 내역 포함
        val ledTeamIds = teamRepository.findAllByLeaderId(userId).map { it.id }
        val memberTeamIds = teamMemberRepository.findActiveByUserId(userId).map { it.teamId }
        val allTeamIds = (ledTeamIds + memberTeamIds).distinct()

        val (apps, total) = applicationRepository.findByApplicantUserIdOrTeamIds(userId, allTeamIds, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return ApplicationListResponse(
            content = apps.map { app ->
                val job = app.job
                app.toSummary(
                    jobTitle = job?.title ?: "",
                    jobPublicId = job?.publicId ?: UUID.randomUUID(),
                    companyName = job?.company?.name ?: "",
                )
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
        )
    }

    fun withdrawApplication(userId: Long, publicId: UUID) {
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)

        // 개인 지원: applicantUserId 일치 확인
        // 팀 지원: 팀장이거나 팀원인지 확인
        val isAuthorized = when (app.applicationType) {
            ApplicationType.INDIVIDUAL -> app.applicantUserId == userId
            ApplicationType.TEAM -> {
                val teamId = app.teamId ?: false
                if (teamId is Long) {
                    val team = teamRepository.findById(teamId)
                    val isLeader = team?.leaderId == userId
                    val isMember = teamMemberRepository.findActiveByUserId(userId)
                        .any { it.teamId == teamId }
                    isLeader || isMember
                } else false
            }
            else -> app.applicantUserId == userId
        }

        if (!isAuthorized) {
            throw ForbiddenException("본인의 지원서만 취소할 수 있습니다")
        }

        app.withdraw()
        applicationRepository.save(app)
        auditService.record("APPLICATION", app.id, "APPLICATION_WITHDRAWN", actorId = userId, actorRole = "WORKER")
    }

    @Transactional(readOnly = true)
    fun getEmployerApplications(
        employerUserId: Long,
        jobPublicId: UUID,
        status: String?,
        page: Int,
        size: Int,
    ): ApplicationListResponse {
        val job = jobRepository.findByPublicId(jobPublicId)
            ?: throw NotFoundException("Job", jobPublicId)

        verifyEmployerOwnsJob(employerUserId, job.companyId)

        val statusFilter = status?.let {
            runCatching { ApplicationStatus.valueOf(it) }.getOrElse {
                throw BusinessException("잘못된 상태 값입니다: $it", "INVALID_STATUS")
            }
        }

        val (apps, total) = applicationRepository.findByJobId(job.id, statusFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return ApplicationListResponse(
            content = apps.map { app ->
                app.toSummary(
                    jobTitle = job.title,
                    jobPublicId = job.publicId,
                    companyName = job.company?.name ?: "",
                )
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
        )
    }

    @Transactional(readOnly = true)
    fun getApplicationDetail(employerUserId: Long, publicId: UUID): ApplicationDetailResponse {
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)

        val job = jobRepository.findById(app.jobId)
            ?: throw NotFoundException("Job", app.jobId)

        verifyEmployerOwnsJob(employerUserId, job.companyId)

        return app.toDetail(job.title, job.publicId, job.company?.name ?: "")
    }

    fun updateApplicationStatus(
        employerUserId: Long,
        publicId: UUID,
        newStatus: String,
        note: String?,
    ): ApplicationDetailResponse {
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)

        val job = jobRepository.findById(app.jobId)
            ?: throw NotFoundException("Job", app.jobId)

        verifyEmployerOwnsJob(employerUserId, job.companyId)

        val status = runCatching { ApplicationStatus.valueOf(newStatus) }.getOrElse {
            throw BusinessException("잘못된 상태 값입니다: $newStatus", "INVALID_STATUS")
        }

        app.transitionTo(status, reviewerUserId = employerUserId, note = note)
        val saved = applicationRepository.save(app)

        auditService.record(
            "APPLICATION", saved.id, "APPLICATION_STATUS_CHANGED",
            actorId = employerUserId, actorRole = "EMPLOYER",
            newData = mapOf("status" to newStatus, "note" to (note ?: "")),
        )

        // Send STATUS_CHANGE notification to applicant
        val recipientUserId: Long? = when {
            saved.applicantUserId != null -> saved.applicantUserId
            saved.teamId != null -> teamRepository.findById(saved.teamId!!)?.leaderId
            else -> null
        }
        if (recipientUserId != null) {
            val statusLabel = when (status) {
                ApplicationStatus.ACCEPTED -> "합격"
                ApplicationStatus.REJECTED -> "불합격"
                ApplicationStatus.REVIEWING -> "검토 중"
                ApplicationStatus.INTERVIEW -> "면접 대기"
                else -> status.name
            }
            runCatching {
                val notif = Notification().apply {
                    this.userId = recipientUserId
                    this.type = NotificationType.STATUS_CHANGE
                    this.title = "지원 현황이 업데이트되었습니다"
                    this.body = "${job.title} 지원 상태가 '$statusLabel'(으)로 변경되었습니다."
                    this.data = mapOf(
                        "applicationPublicId" to saved.publicId.toString(),
                        "jobTitle" to job.title,
                        "status" to newStatus,
                    )
                }
                notificationRepository.save(notif)
            }
        }

        return saved.toDetail(job.title, job.publicId, job.company?.name ?: "")
    }

    fun scoutApplicant(employerUserId: Long, publicId: UUID): ApplicationDetailResponse {
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)

        val job = jobRepository.findById(app.jobId)
            ?: throw NotFoundException("Job", app.jobId)

        verifyEmployerOwnsJob(employerUserId, job.companyId)

        app.scout()
        val saved = applicationRepository.save(app)

        auditService.record("APPLICATION", saved.id, "APPLICATION_SCOUTED", actorId = employerUserId, actorRole = "EMPLOYER")

        return saved.toDetail(job.title, job.publicId, job.company?.name ?: "")
    }

    @Transactional(readOnly = true)
    fun getAdminApplications(
        status: String?,
        applicationType: String?,
        jobPublicId: String?,
        page: Int,
        size: Int,
    ): ApplicationListResponse {
        val statusFilter = status?.let {
            runCatching { ApplicationStatus.valueOf(it) }.getOrNull()
        }
        val typeFilter = applicationType?.let {
            runCatching { ApplicationType.valueOf(it) }.getOrNull()
        }
        val jobIdFilter = jobPublicId?.let { pubId ->
            runCatching { UUID.fromString(pubId) }.getOrNull()?.let { uuid ->
                jobRepository.findByPublicId(uuid)?.id
            }
        }

        val (apps, total) = applicationRepository.findAll(statusFilter, typeFilter, jobIdFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return ApplicationListResponse(
            content = apps.map { app ->
                val job = app.job
                app.toSummary(
                    jobTitle = job?.title ?: "",
                    jobPublicId = job?.publicId ?: UUID.randomUUID(),
                    companyName = job?.company?.name ?: "",
                )
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
        )
    }

    @Transactional(readOnly = true)
    fun getAdminApplicationDetail(publicId: UUID): ApplicationDetailResponse {
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)

        val job = jobRepository.findById(app.jobId)
            ?: throw NotFoundException("Job", app.jobId)

        return app.toDetail(job.title, job.publicId, job.company?.name ?: "")
    }

    fun verifyApplication(adminUserId: Long, publicId: UUID): ApplicationDetailResponse {
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)

        val job = jobRepository.findById(app.jobId)
            ?: throw NotFoundException("Job", app.jobId)

        app.verify()
        val saved = applicationRepository.save(app)

        auditService.record("APPLICATION", saved.id, "APPLICATION_VERIFIED", actorId = adminUserId, actorRole = "ADMIN")

        return saved.toDetail(job.title, job.publicId, job.company?.name ?: "")
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private fun verifyEmployerOwnsJob(employerUserId: Long, jobCompanyId: Long) {
        val profile = employerProfileRepository.findByUserId(employerUserId)
            ?: throw ForbiddenException("Employer profile not found")

        if (profile.companyId == null || profile.companyId != jobCompanyId) {
            throw ForbiddenException("해당 공고에 대한 접근 권한이 없습니다")
        }
    }
}

// ─── Extension helpers ───────────────────────────────────────────────────────

private fun Application.toSummary(
    jobTitle: String,
    jobPublicId: UUID,
    companyName: String,
) = ApplicationSummaryResponse(
    publicId = publicId,
    jobTitle = jobTitle,
    jobPublicId = jobPublicId,
    companyName = companyName,
    applicationType = applicationType.name,
    status = status.name,
    statusUpdatedAt = statusUpdatedAt,
    isScouted = isScouted,
    isVerified = isVerified,
    workerSnapshot = workerSnapshot,
    appliedAt = createdAt,
)

private fun Application.toDetail(
    jobTitle: String,
    jobPublicId: UUID,
    companyName: String,
) = ApplicationDetailResponse(
    publicId = publicId,
    jobTitle = jobTitle,
    jobPublicId = jobPublicId,
    companyName = companyName,
    applicationType = applicationType.name,
    status = status.name,
    statusUpdatedAt = statusUpdatedAt,
    isScouted = isScouted,
    isVerified = isVerified,
    coverLetter = coverLetter,
    employerNote = employerNote,
    workerSnapshot = workerSnapshot,
    teamSnapshot = teamSnapshot,
    companySnapshot = companySnapshot,
    statusHistory = statusHistory.map { h ->
        StatusHistoryItem(
            fromStatus = h.fromStatus?.name,
            toStatus = h.toStatus.name,
            changedBy = h.changedBy,
            note = h.note,
            createdAt = h.createdAt,
        )
    },
    appliedAt = createdAt,
)

// ─── Response data classes ───────────────────────────────────────────────────

data class ApplicationSummaryResponse(
    val publicId: UUID,
    val jobTitle: String,
    val jobPublicId: UUID,
    val companyName: String,
    val applicationType: String,
    val status: String,
    val statusUpdatedAt: Instant,
    val isScouted: Boolean,
    val isVerified: Boolean,
    val workerSnapshot: WorkerSnapshot,
    val appliedAt: Instant,
)

data class ApplicationDetailResponse(
    val publicId: UUID,
    val jobTitle: String,
    val jobPublicId: UUID,
    val companyName: String,
    val applicationType: String,
    val status: String,
    val statusUpdatedAt: Instant,
    val isScouted: Boolean,
    val isVerified: Boolean,
    val coverLetter: String?,
    val employerNote: String?,
    val workerSnapshot: WorkerSnapshot,
    val teamSnapshot: TeamSnapshot?,
    val companySnapshot: CompanySnapshot?,
    val statusHistory: List<StatusHistoryItem>,
    val appliedAt: Instant,
)

data class StatusHistoryItem(
    val fromStatus: String?,
    val toStatus: String,
    val changedBy: Long?,
    val note: String?,
    val createdAt: Instant,
)

data class ApplicationListResponse(
    val content: List<ApplicationSummaryResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)
