package com.gada.api.domain.notification

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "sms_templates",
    uniqueConstraints = [UniqueConstraint(name = "uq_sms_templates_code_locale", columnNames = ["code", "locale"])]
)
class SmsTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "code", length = 100, nullable = false)
    var code: String = ""

    @Column(name = "name", length = 200, nullable = false)
    var name: String = ""

    @Column(name = "locale", length = 10, nullable = false)
    var locale: String = "ko"

    @Column(name = "content", columnDefinition = "text", nullable = false)
    var content: String = ""

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variables", columnDefinition = "jsonb", nullable = false)
    var variables: List<String> = emptyList()

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null

    fun softDelete() {
        deletedAt = Instant.now()
    }

    fun restore() {
        deletedAt = null
    }
}
