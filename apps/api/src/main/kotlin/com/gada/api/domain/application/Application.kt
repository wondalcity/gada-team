package com.gada.api.domain.application

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.gada.api.common.BaseEntity
import com.gada.api.domain.company.Company
import com.gada.api.domain.job.Job
import com.gada.api.domain.team.Team
import com.gada.api.domain.user.User
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.hibernate.type.SqlTypes
import java.time.Instant

@Entity
@Table(
    name = "applications",
    indexes = [
        Index(name = "idx_applications_job_id", columnList = "job_id"),
        Index(name = "idx_applications_applicant_user_id", columnList = "applicant_user_id"),
        Index(name = "idx_applications_team_id", columnList = "team_id"),
        Index(name = "idx_applications_company_id", columnList = "company_id"),
        Index(name = "idx_applications_status", columnList = "status"),
    ]
)
class Application : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "job_id", nullable = false)
    var jobId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", insertable = false, updatable = false)
    var job: Job? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "application_type", columnDefinition = "application_type", nullable = false)
    var applicationType: ApplicationType = ApplicationType.INDIVIDUAL

    // Exactly one of the following is non-null based on applicationType

    @Column(name = "applicant_user_id")
    var applicantUserId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_user_id", insertable = false, updatable = false)
    var applicantUser: User? = null

    @Column(name = "team_id")
    var teamId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", insertable = false, updatable = false)
    var team: Team? = null

    @Column(name = "company_id")
    var companyId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    var company: Company? = null

    // ─── Content ─────────────────────────────────────────────

    @Column(name = "cover_letter", columnDefinition = "text")
    var coverLetter: String? = null

    // ─── ATS ─────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", columnDefinition = "application_status", nullable = false)
    var status: ApplicationStatus = ApplicationStatus.APPLIED

    @Column(name = "employer_note", columnDefinition = "text")
    var employerNote: String? = null

    @Column(name = "reviewed_by")
    var reviewedBy: Long? = null

    @Column(name = "reviewed_at")
    var reviewedAt: Instant? = null

    @Column(name = "status_updated_at", nullable = false)
    var statusUpdatedAt: Instant = Instant.now()

    // ─── Snapshots ───────────────────────────────────────────

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "worker_snapshot", columnDefinition = "jsonb", nullable = false)
    var workerSnapshot: WorkerSnapshot = WorkerSnapshot()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "team_snapshot", columnDefinition = "jsonb")
    var teamSnapshot: TeamSnapshot? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "company_snapshot", columnDefinition = "jsonb")
    var companySnapshot: CompanySnapshot? = null

    // ─── Flags ───────────────────────────────────────────────

    @Column(name = "is_scouted")
    var isScouted: Boolean = false

    @Column(name = "is_verified")
    var isVerified: Boolean = false

    // ─── Status history ──────────────────────────────────────

    @OneToMany(mappedBy = "application", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var statusHistory: MutableList<ApplicationStatusHistory> = mutableListOf()

    // ─── Domain logic ────────────────────────────────────────

    fun transitionTo(newStatus: ApplicationStatus, reviewerUserId: Long? = null, note: String? = null) {
        val previousStatus = this.status
        this.status = newStatus
        this.statusUpdatedAt = Instant.now()
        if (reviewerUserId != null) {
            this.reviewedBy = reviewerUserId
            this.reviewedAt = Instant.now()
        }
        statusHistory.add(
            ApplicationStatusHistory().apply {
                this.applicationId = this@Application.id
                this.application = this@Application
                this.fromStatus = previousStatus
                this.toStatus = newStatus
                this.changedBy = reviewerUserId
                this.note = note
            }
        )
    }

    fun withdraw() = transitionTo(ApplicationStatus.WITHDRAWN)

    fun review(note: String? = null) = transitionTo(ApplicationStatus.UNDER_REVIEW, reviewerUserId = reviewedBy, note = note)

    fun shortlist() = transitionTo(ApplicationStatus.SHORTLISTED, reviewerUserId = reviewedBy)

    fun scheduleInterview(reviewerUserId: Long) = transitionTo(ApplicationStatus.INTERVIEW_PENDING, reviewerUserId)

    fun hold(reviewerUserId: Long, note: String? = null) = transitionTo(ApplicationStatus.ON_HOLD, reviewerUserId, note)

    fun hire(reviewerUserId: Long) = transitionTo(ApplicationStatus.HIRED, reviewerUserId)

    fun reject(reviewerUserId: Long, note: String? = null) = transitionTo(ApplicationStatus.REJECTED, reviewerUserId, note)

    fun scout() {
        isScouted = true
    }

    fun verify() {
        isVerified = true
    }
}

enum class ApplicationType {
    INDIVIDUAL,
    TEAM,
    COMPANY,
}

enum class ApplicationStatus {
    APPLIED,
    UNDER_REVIEW,
    SHORTLISTED,
    INTERVIEW_PENDING,
    ON_HOLD,
    REJECTED,
    HIRED,
    WITHDRAWN,
}

// ─── Snapshot data classes ────────────────────────────────────────────────────

@JsonIgnoreProperties(ignoreUnknown = true)
data class WorkerSnapshot(
    val fullName: String = "",
    val birthDate: String = "",
    val nationality: String = "KR",
    val visaType: String = "CITIZEN",
    val healthCheckStatus: String = "NOT_DONE",
    val healthCheckExpiry: String? = null,
    val languages: List<Map<String, String>> = emptyList(),
    val certifications: List<Map<String, String>> = emptyList(),
    val portfolio: List<Map<String, Any>> = emptyList(),
    val desiredPayMin: Int? = null,
    val desiredPayMax: Int? = null,
    val desiredPayUnit: String? = null,
    val profileImageUrl: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class TeamSnapshot(
    val name: String = "",
    val type: String = "",
    val description: String? = null,
    val memberCount: Int = 0,
    val regions: List<Map<String, String>> = emptyList(),
    val desiredPayMin: Int? = null,
    val desiredPayMax: Int? = null,
    val desiredPayUnit: String? = null,
    val coverImageUrl: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CompanySnapshot(
    val name: String = "",
    val businessRegistrationNumber: String = "",
    val representativeName: String = "",
    val industry: String? = null,
)
