package com.gada.api.domain.user

import com.gada.api.common.BaseEntity
import com.gada.api.common.model.*
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.hibernate.type.SqlTypes
import java.time.LocalDate

@Entity
@Table(
    name = "worker_profiles",
    indexes = [
        Index(name = "idx_worker_profiles_nationality", columnList = "nationality"),
        Index(name = "idx_worker_profiles_visa_type", columnList = "visa_type"),
        Index(name = "idx_worker_profiles_health_check", columnList = "health_check_status"),
    ]
)
class WorkerProfile : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "user_id", nullable = false, unique = true)
    var userId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    var user: User? = null

    // ─── Required fields ─────────────────────────────────────

    @Column(name = "full_name", length = 100, nullable = false)
    var fullName: String = ""

    @Column(name = "birth_date", nullable = false)
    var birthDate: LocalDate = LocalDate.now()

    @Column(name = "profile_image_url", length = 500)
    var profileImageUrl: String? = null

    // ─── Identity ────────────────────────────────────────────

    @Column(name = "nationality", length = 10, nullable = false)
    var nationality: String = "KR"   // ISO 3166-1 alpha-2

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "visa_type", length = 20)
    var visaType: VisaType = VisaType.CITIZEN

    // ─── JSONB arrays ────────────────────────────────────────

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "languages", columnDefinition = "jsonb", nullable = false)
    var languages: List<LanguageEntry> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "desired_job_categories", columnDefinition = "jsonb", nullable = false)
    var desiredJobCategories: List<Long> = emptyList()   // job_category ids

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "equipment", columnDefinition = "jsonb", nullable = false)
    var equipment: List<String> = emptyList()            // equipment code strings

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certifications", columnDefinition = "jsonb", nullable = false)
    var certifications: List<CertificationEntry> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "portfolio", columnDefinition = "jsonb", nullable = false)
    var portfolio: List<PortfolioEntry> = emptyList()

    // ─── Pay expectation ─────────────────────────────────────

    @Column(name = "desired_pay_min")
    var desiredPayMin: Int? = null

    @Column(name = "desired_pay_max")
    var desiredPayMax: Int? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "desired_pay_unit", length = 20)
    var desiredPayUnit: PayUnit? = null

    // ─── Health ──────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "health_check_status", length = 20, nullable = false)
    var healthCheckStatus: HealthCheckStatus = HealthCheckStatus.NOT_DONE

    @Column(name = "health_check_expiry")
    var healthCheckExpiry: LocalDate? = null

    // ─── Bio / visibility ────────────────────────────────────

    @Column(name = "bio", columnDefinition = "text")
    var bio: String? = null

    @Column(name = "is_public", nullable = false)
    var isPublic: Boolean = true

    // ─── Domain helpers ──────────────────────────────────────

    val hasHealthCheck: Boolean
        get() = healthCheckStatus == HealthCheckStatus.COMPLETED

    fun updateHealthCheck(status: HealthCheckStatus, expiryDate: LocalDate? = null) {
        healthCheckStatus = status
        healthCheckExpiry = expiryDate
    }
}

enum class VisaType {
    CITIZEN,   // 내국인
    F4,        // 재외동포
    F5,        // 영주
    F6,        // 결혼이민
    H2,        // 방문취업
    E9,        // 비전문취업
    E7,        // 특정활동
    D8,        // 기업투자
    OTHER,
}

enum class HealthCheckStatus {
    NOT_DONE,
    SCHEDULED,
    COMPLETED,
    EXPIRED,
}

enum class PayUnit {
    HOURLY,
    DAILY,
    WEEKLY,
    MONTHLY,
    LUMP_SUM,
}
