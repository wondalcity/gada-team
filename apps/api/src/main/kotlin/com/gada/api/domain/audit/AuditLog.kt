package com.gada.api.domain.audit

import jakarta.persistence.*
import org.hibernate.annotations.ColumnTransformer
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

/**
 * Immutable audit trail for all entity mutations.
 * Written directly; never updated or soft-deleted.
 */
@Entity
@Table(
    name = "audit_logs",
    indexes = [
        Index(name = "idx_audit_logs_entity", columnList = "entity_type,entity_id"),
        Index(name = "idx_audit_logs_actor_id", columnList = "actor_id"),
        Index(name = "idx_audit_logs_created_at", columnList = "created_at"),
    ]
)
class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "entity_type", length = 100, nullable = false)
    var entityType: String = ""

    @Column(name = "entity_id", nullable = false)
    var entityId: Long = 0

    @Column(name = "action", length = 50, nullable = false)
    var action: String = ""     // CREATE | UPDATE | DELETE | STATUS_CHANGE | ADMIN_OVERRIDE

    @Column(name = "actor_id")
    var actorId: Long? = null

    @ColumnTransformer(write = "?::user_role")
    @Column(name = "actor_role")
    var actorRole: String? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_data", columnDefinition = "jsonb")
    var oldData: com.fasterxml.jackson.databind.JsonNode? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_data", columnDefinition = "jsonb")
    var newData: com.fasterxml.jackson.databind.JsonNode? = null

    @Column(name = "ip_address", length = 45)
    var ipAddress: String? = null

    @Column(name = "user_agent", length = 500)
    var userAgent: String? = null

    @Column(name = "request_id", length = 100)
    var requestId: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}
