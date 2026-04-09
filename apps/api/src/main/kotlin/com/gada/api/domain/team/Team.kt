package com.gada.api.domain.team

import com.gada.api.common.BaseEntity
import com.gada.api.common.model.IntroTranslation
import com.gada.api.common.model.PortfolioEntry
import com.gada.api.common.model.RegionEntry
import com.gada.api.domain.company.Company
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.hibernate.type.SqlTypes

@Entity
@Table(
    name = "teams",
    indexes = [
        Index(name = "idx_teams_leader_id", columnList = "leader_id"),
        Index(name = "idx_teams_company_id", columnList = "company_id"),
        Index(name = "idx_teams_status", columnList = "status"),
    ]
)
class Team : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "name", length = 200, nullable = false)
    var name: String = ""

    @Column(name = "leader_id", nullable = false)
    var leaderId: Long = 0

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "team_type", columnDefinition = "team_type", nullable = false)
    var teamType: TeamType = TeamType.SQUAD

    @Column(name = "company_id")
    var companyId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    var company: Company? = null

    // ─── Intro ───────────────────────────────────────────────

    @Column(name = "intro_short", length = 500)
    var introShort: String? = null

    @Column(name = "intro_long", columnDefinition = "text")
    var introLong: String? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "intro_multilingual", columnDefinition = "jsonb", nullable = false)
    var introMultilingual: Map<String, IntroTranslation> = emptyMap()
    // e.g. {"en": {short, long}, "vi": {short, long}}

    // ─── Coverage ────────────────────────────────────────────

    @Column(name = "is_nationwide", nullable = false)
    var isNationwide: Boolean = false

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "regions", columnDefinition = "jsonb", nullable = false)
    var regions: List<RegionEntry> = emptyList()

    // ─── Capabilities ────────────────────────────────────────

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "equipment", columnDefinition = "jsonb", nullable = false)
    var equipment: List<String> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "portfolio", columnDefinition = "jsonb", nullable = false)
    var portfolio: List<PortfolioEntry> = emptyList()

    // ─── Pay expectation ─────────────────────────────────────

    @Column(name = "desired_pay_min")
    var desiredPayMin: Int? = null

    @Column(name = "desired_pay_max")
    var desiredPayMax: Int? = null

    @Column(name = "desired_pay_unit", length = 20)
    var desiredPayUnit: String? = null   // HOURLY | DAILY | WEEKLY | MONTHLY | LUMP_SUM

    @Column(name = "cover_image_url", length = 500)
    var coverImageUrl: String? = null

    @Column(name = "headcount_target")
    var headcountTarget: Int? = null

    // ─── Counters ────────────────────────────────────────────

    @Column(name = "member_count", nullable = false)
    var memberCount: Int = 1

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", columnDefinition = "team_status", nullable = false)
    var status: TeamStatus = TeamStatus.ACTIVE

    // ─── Relationships ───────────────────────────────────────

    @OneToMany(mappedBy = "team", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var members: MutableList<TeamMember> = mutableListOf()

    // ─── Domain helpers ──────────────────────────────────────

    val isActive: Boolean get() = status == TeamStatus.ACTIVE

    fun disband() {
        status = TeamStatus.DISSOLVED
    }

    fun introFor(locale: String): IntroTranslation? = introMultilingual[locale]
}

enum class TeamType {
    SQUAD,
    COMPANY_LINKED,
}

enum class TeamStatus {
    ACTIVE,
    INACTIVE,
    DISSOLVED,
}
