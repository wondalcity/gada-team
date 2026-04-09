package com.gada.api.domain.application

import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.time.Instant

/**
 * Immutable audit trail for application status changes.
 * Append-only: no updated_at or deleted_at.
 */
@Entity
@Table(
    name = "application_status_history",
    indexes = [
        Index(name = "idx_app_status_history_application_id", columnList = "application_id")
    ]
)
class ApplicationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "application_id", nullable = false)
    var applicationId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", insertable = false, updatable = false)
    var application: Application? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "from_status", columnDefinition = "application_status")
    var fromStatus: ApplicationStatus? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "to_status", columnDefinition = "application_status", nullable = false)
    var toStatus: ApplicationStatus = ApplicationStatus.APPLIED

    @Column(name = "changed_by")
    var changedBy: Long? = null

    @Column(name = "note", length = 500)
    var note: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}
