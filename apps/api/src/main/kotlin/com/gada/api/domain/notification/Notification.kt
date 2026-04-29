package com.gada.api.domain.notification

import com.gada.api.domain.user.User
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

/**
 * In-app notifications. Append-mostly; V2 added updated_at for is_read tracking.
 */
@Entity
@Table(
    name = "notifications",
    indexes = [
        Index(name = "idx_notifications_user_id", columnList = "user_id"),
        Index(name = "idx_notifications_created_at", columnList = "created_at"),
    ]
)
class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    var user: User? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "type", columnDefinition = "notification_type", nullable = false)
    var type: NotificationType = NotificationType.SYSTEM

    @Column(name = "title", length = 200, nullable = false)
    var title: String = ""

    @Column(name = "body", columnDefinition = "text", nullable = false)
    var body: String = ""

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "jsonb", nullable = false)
    var data: Map<String, Any> = emptyMap()

    @Column(name = "is_read", nullable = false)
    var isRead: Boolean = false

    @Column(name = "read_at")
    var readAt: Instant? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    // Added in V2
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    // Added in V8 — admin soft-delete support
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null

    // ─── Domain helpers ──────────────────────────────────────

    fun markRead() {
        isRead = true
        readAt = Instant.now()
        updatedAt = Instant.now()
    }

    fun softDelete() {
        deletedAt = Instant.now()
    }

    fun restore() {
        deletedAt = null
    }
}

enum class NotificationType {
    APPLICATION,
    SCOUT,
    STATUS_CHANGE,
    SYSTEM,
    MARKETING,
    CHAT,
}
