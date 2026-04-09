package com.gada.api.domain.job

import com.gada.api.common.model.FaqEntry
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

/**
 * Job category reference entity.
 * Extends no base entity because it has no deleted_at in V1 (uses is_active flag).
 * V2 adds deleted_at for admin soft-delete. We map it here so the field is usable.
 */
@Entity
@Table(
    name = "job_categories",
    uniqueConstraints = [UniqueConstraint(name = "uq_job_categories_code", columnNames = ["code"])]
)
class JobCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "code", length = 50, nullable = false, unique = true)
    var code: String = ""

    @Column(name = "name_ko", length = 100, nullable = false)
    var nameKo: String = ""

    @Column(name = "name_en", length = 100)
    var nameEn: String? = null

    @Column(name = "name_vi", length = 100)
    var nameVi: String? = null

    @Column(name = "description_ko", columnDefinition = "text")
    var descriptionKo: String? = null

    @Column(name = "description_en", columnDefinition = "text")
    var descriptionEn: String? = null

    @Column(name = "description_vi", columnDefinition = "text")
    var descriptionVi: String? = null

    @Column(name = "icon_url", length = 500)
    var iconUrl: String? = null

    @Column(name = "parent_id")
    var parentId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", insertable = false, updatable = false)
    var parent: JobCategory? = null

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    // added in V2
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null

    // ─── Helper ──────────────────────────────────────────────

    fun nameFor(locale: String): String = when (locale) {
        "en" -> nameEn ?: nameKo
        "vi" -> nameVi ?: nameKo
        else -> nameKo
    }
}
