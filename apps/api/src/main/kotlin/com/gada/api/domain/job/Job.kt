package com.gada.api.domain.job

import com.gada.api.common.BaseEntity
import com.gada.api.domain.company.Company
import com.gada.api.domain.company.Site
import com.gada.api.domain.user.PayUnit
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.time.Instant
import java.time.LocalDate

@Entity
@Table(
    name = "jobs",
    indexes = [
        Index(name = "idx_jobs_site_id", columnList = "site_id"),
        Index(name = "idx_jobs_company_id", columnList = "company_id"),
        Index(name = "idx_jobs_category_id", columnList = "job_category_id"),
        Index(name = "idx_jobs_status", columnList = "status"),
    ]
)
class Job : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    // ─── FK columns ──────────────────────────────────────────

    @Column(name = "site_id", nullable = false)
    var siteId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", insertable = false, updatable = false)
    var site: Site? = null

    @Column(name = "company_id", nullable = false)
    var companyId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    var company: Company? = null

    @Column(name = "job_category_id")
    var jobCategoryId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_category_id", insertable = false, updatable = false)
    var jobCategory: JobCategory? = null

    // ─── Core fields ─────────────────────────────────────────

    @Column(name = "title", length = 300, nullable = false)
    var title: String = ""

    @Column(name = "description", columnDefinition = "text")
    var description: String? = null

    @Column(name = "required_count")
    var requiredCount: Int? = null

    // ─── Application type flags (stored as JSONB string array) ──

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "application_types", columnDefinition = "jsonb", nullable = false)
    var applicationTypes: List<String> = listOf("INDIVIDUAL", "TEAM", "COMPANY")

    // ─── Pay ─────────────────────────────────────────────────

    @Column(name = "pay_min")
    var payMin: Int? = null

    @Column(name = "pay_max")
    var payMax: Int? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "pay_unit", length = 20, nullable = false)
    var payUnit: PayUnit = PayUnit.DAILY

    // ─── Requirements (JSONB arrays of codes) ────────────────

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "visa_requirements", columnDefinition = "jsonb", nullable = false)
    var visaRequirements: List<String> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certification_requirements", columnDefinition = "jsonb", nullable = false)
    var certificationRequirements: List<String> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "equipment_requirements", columnDefinition = "jsonb", nullable = false)
    var equipmentRequirements: List<String> = emptyList()

    @Column(name = "health_check_required", nullable = false)
    var healthCheckRequired: Boolean = false

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "nationality_requirements", columnDefinition = "jsonb", nullable = false)
    var nationalityRequirements: List<String> = emptyList()

    // ─── Scheduling ──────────────────────────────────────────

    @Column(name = "always_open", nullable = false)
    var alwaysOpen: Boolean = false

    @Column(name = "start_date")
    var startDate: LocalDate? = null

    @Column(name = "end_date")
    var endDate: LocalDate? = null

    // ─── State ───────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", length = 20, nullable = false)
    var status: JobStatus = JobStatus.DRAFT

    @Column(name = "view_count", nullable = false)
    var viewCount: Int = 0

    @Column(name = "application_count", nullable = false)
    var applicationCount: Int = 0

    @Column(name = "published_at")
    var publishedAt: Instant? = null

    // ─── V4 additions ────────────────────────────────────────

    @Column(name = "accommodation_provided", nullable = false)
    var accommodationProvided: Boolean = false

    @Column(name = "meal_provided", nullable = false)
    var mealProvided: Boolean = false

    @Column(name = "transportation_provided", nullable = false)
    var transportationProvided: Boolean = false

    @Column(name = "poster_user_id")
    var posterUserId: Long? = null

    @Column(name = "closed_by")
    var closedBy: Long? = null

    @Column(name = "closed_reason", columnDefinition = "text")
    var closedReason: String? = null

    // ─── Domain logic ────────────────────────────────────────

    fun publish() {
        status = JobStatus.PUBLISHED
        publishedAt = Instant.now()
    }

    fun pause() {
        status = JobStatus.PAUSED
    }

    fun close() {
        status = JobStatus.CLOSED
    }

    fun incrementViewCount() {
        viewCount++
    }

    fun incrementApplicationCount() {
        applicationCount++
    }

    val isOpen: Boolean
        get() = status == JobStatus.PUBLISHED && !isDeleted

    val allowsIndividual: Boolean get() = applicationTypes.contains("INDIVIDUAL")
    val allowsTeam: Boolean get() = applicationTypes.contains("TEAM")
    val allowsCompany: Boolean get() = applicationTypes.contains("COMPANY")
}

enum class JobStatus {
    DRAFT,
    PUBLISHED,
    PAUSED,
    CLOSED,
    ARCHIVED,
}
