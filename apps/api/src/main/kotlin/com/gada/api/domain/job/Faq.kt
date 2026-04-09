package com.gada.api.domain.job

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

/**
 * Platform-level FAQ. V2 added deleted_at for soft-delete.
 * V7 added category_id FK to job_categories.
 */
@Entity
@Table(
    name = "faqs",
    indexes = [
        Index(name = "idx_faqs_category_locale", columnList = "category,locale")
    ]
)
class Faq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "category", length = 100)
    var category: String? = null

    @Column(name = "locale", length = 10, nullable = false)
    var locale: String = "ko"

    @Column(name = "question", columnDefinition = "text", nullable = false)
    var question: String = ""

    @Column(name = "answer", columnDefinition = "text", nullable = false)
    var answer: String = ""

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0

    @Column(name = "is_published", nullable = false)
    var isPublished: Boolean = false

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    // Added in V2
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null

    val isDeleted: Boolean get() = deletedAt != null

    fun softDelete() {
        deletedAt = Instant.now()
    }

    fun restore() {
        deletedAt = null
    }

    // Added in V7
    @Column(name = "category_id")
    var categoryId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    var jobCategory: JobCategory? = null
}
