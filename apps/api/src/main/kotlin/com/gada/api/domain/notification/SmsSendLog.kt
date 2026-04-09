package com.gada.api.domain.notification

import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

enum class SmsStatus {
    PENDING, SENDING, SENT, DELIVERED, FAILED, CANCELLED
}

@Entity
@Table(
    name = "sms_send_logs",
    indexes = [
        Index(name = "idx_sms_logs_user_id",    columnList = "user_id"),
        Index(name = "idx_sms_logs_status",      columnList = "status,created_at"),
        Index(name = "idx_sms_logs_to_phone",    columnList = "to_phone,created_at"),
        Index(name = "idx_sms_logs_created_at",  columnList = "created_at"),
    ]
)
class SmsSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "template_id")
    var templateId: Long? = null

    @Column(name = "template_code", length = 100)
    var templateCode: String? = null

    @Column(name = "to_phone", length = 20, nullable = false)
    var toPhone: String = ""

    @Column(name = "user_id")
    var userId: Long? = null

    @Column(name = "content", columnDefinition = "text", nullable = false)
    var content: String = ""

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variables", columnDefinition = "jsonb", nullable = false)
    var variables: Map<String, String> = emptyMap()

    @Column(name = "locale", length = 10, nullable = false)
    var locale: String = "ko"

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", columnDefinition = "sms_status", nullable = false)
    var status: SmsStatus = SmsStatus.PENDING

    @Column(name = "provider", length = 50)
    var provider: String? = null

    @Column(name = "provider_msg_id", length = 200)
    var providerMsgId: String? = null

    @Column(name = "error_code", length = 100)
    var errorCode: String? = null

    @Column(name = "error_message", columnDefinition = "text")
    var errorMessage: String? = null

    @Column(name = "sent_at")
    var sentAt: Instant? = null

    @Column(name = "delivered_at")
    var deliveredAt: Instant? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    // V9 retry/scheduling fields
    @Column(name = "attempt_count", nullable = false)
    var attemptCount: Int = 0

    @Column(name = "max_attempts", nullable = false)
    var maxAttempts: Int = 3

    @Column(name = "next_retry_at")
    var nextRetryAt: Instant? = null

    @Column(name = "scheduled_at")
    var scheduledAt: Instant? = null

    @Column(name = "admin_user_id")
    var adminUserId: Long? = null

    @Column(name = "trigger_event", length = 100)
    var triggerEvent: String? = null   // ONBOARD | ADMIN_SEND | BROADCAST | APPLICATION_STATUS | etc.

    // ─── Domain logic ────────────────────────────────────────────

    val canRetry: Boolean
        get() = status == SmsStatus.FAILED && attemptCount < maxAttempts

    fun markSending() {
        status = SmsStatus.SENDING
        updatedAt = Instant.now()
    }

    fun markSent(providerMsgId: String?, providerName: String?) {
        status = SmsStatus.SENT
        this.providerMsgId = providerMsgId
        this.provider = providerName
        this.sentAt = Instant.now()
        this.updatedAt = Instant.now()
    }

    fun markFailed(errorCode: String?, errorMessage: String?) {
        status = SmsStatus.FAILED
        this.errorCode = errorCode
        this.errorMessage = errorMessage
        attemptCount++
        // Exponential backoff: 5min, 15min, 45min
        nextRetryAt = if (canRetry) Instant.now().plusSeconds(300L * (1 shl (attemptCount - 1))) else null
        updatedAt = Instant.now()
    }

    fun scheduleRetry() {
        status = SmsStatus.PENDING
        updatedAt = Instant.now()
    }
}
