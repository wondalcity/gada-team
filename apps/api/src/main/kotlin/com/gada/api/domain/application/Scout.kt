package com.gada.api.domain.application

import com.gada.api.domain.job.Job
import com.gada.api.domain.team.Team
import com.gada.api.domain.user.User
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.time.Instant
import java.util.UUID

/**
 * Employer-initiated outreach to a worker or team.
 * V2 added updated_at so we map it here.
 */
@Entity
@Table(
    name = "scouts",
    indexes = [
        Index(name = "idx_scouts_job_id", columnList = "job_id"),
        Index(name = "idx_scouts_target_user_id", columnList = "target_user_id"),
        Index(name = "idx_scouts_target_team_id", columnList = "target_team_id"),
    ]
)
class Scout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "job_id", nullable = false)
    var jobId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", insertable = false, updatable = false)
    var job: Job? = null

    @Column(name = "sender_user_id", nullable = false)
    var senderUserId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id", insertable = false, updatable = false)
    var senderUser: User? = null

    // Exactly one is set
    @Column(name = "target_user_id")
    var targetUserId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", insertable = false, updatable = false)
    var targetUser: User? = null

    @Column(name = "target_team_id")
    var targetTeamId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_team_id", insertable = false, updatable = false)
    var targetTeam: Team? = null

    @Column(name = "message", columnDefinition = "text", nullable = false)
    var message: String = ""

    @Column(name = "is_read", nullable = false)
    var isRead: Boolean = false

    @Column(name = "read_at")
    var readAt: Instant? = null

    @Column(name = "responded_at")
    var respondedAt: Instant? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "response", columnDefinition = "scout_response")
    var response: ScoutResponse? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    // Added in V2
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    // ─── Domain helpers ──────────────────────────────────────

    fun markRead() {
        isRead = true
        readAt = Instant.now()
        updatedAt = Instant.now()
    }

    fun accept() {
        response = ScoutResponse.ACCEPTED
        respondedAt = Instant.now()
        updatedAt = Instant.now()
    }

    fun decline() {
        response = ScoutResponse.DECLINED
        respondedAt = Instant.now()
        updatedAt = Instant.now()
    }
}

enum class ScoutResponse {
    ACCEPTED,
    DECLINED,
}
