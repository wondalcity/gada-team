package com.gada.api.domain.team

import com.gada.api.domain.user.HealthCheckStatus
import com.gada.api.domain.user.User
import com.gada.api.domain.user.VisaType
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.hibernate.type.SqlTypes
import java.time.Instant

/**
 * Team membership record. left_at = null means currently active member.
 * No base entity: this table has joined_at / left_at only — no updated_at.
 */
@Entity
@Table(
    name = "team_members",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_team_members_team_user", columnNames = ["team_id", "user_id"])
    ],
    indexes = [
        Index(name = "idx_team_members_team_id", columnList = "team_id"),
        Index(name = "idx_team_members_user_id", columnList = "user_id"),
    ]
)
class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "team_id", nullable = false)
    var teamId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", insertable = false, updatable = false)
    var team: Team? = null

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    var user: User? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "role", columnDefinition = "team_member_role", nullable = false)
    var role: TeamMemberRole = TeamMemberRole.MEMBER

    @Column(name = "joined_at")
    var joinedAt: Instant? = null

    @Column(name = "left_at")
    var leftAt: Instant? = null

    // ─── V3/V4 additions ────────────────────────────────────

    @Column(name = "nationality", length = 10)
    var nationality: String? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "visa_type", columnDefinition = "visa_type")
    var visaType: VisaType? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "health_check_status", columnDefinition = "health_check_status")
    var healthCheckStatus: HealthCheckStatus? = null

    @Column(name = "health_check_expiry")
    var healthCheckExpiry: java.time.LocalDate? = null

    @Column(name = "profile_image_url", length = 500)
    var profileImageUrl: String? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "invitation_status", columnDefinition = "invitation_status")
    var invitationStatus: InvitationStatus? = null

    @Column(name = "invited_by")
    var invitedBy: Long? = null

    @Column(name = "invited_at")
    var invitedAt: Instant? = null

    @Column(name = "full_name", length = 100)
    var fullName: String? = null

    @Column(name = "birth_date")
    var birthDate: java.time.LocalDate? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certifications", columnDefinition = "jsonb", nullable = false)
    var certifications: List<com.gada.api.common.model.CertificationEntry> = emptyList()

    // ─── Domain helpers ──────────────────────────────────────

    val isActive: Boolean get() = leftAt == null

    fun leave() {
        leftAt = Instant.now()
    }
}

enum class TeamMemberRole {
    LEADER,
    MEMBER,
}

enum class InvitationStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    EXPIRED,
}
