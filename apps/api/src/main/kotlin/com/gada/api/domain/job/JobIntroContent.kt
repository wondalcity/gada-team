package com.gada.api.domain.job

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

/**
 * Rich intro content for job category detail pages (multilingual CMS).
 * V2 added deleted_at for admin soft-delete.
 * V7 added JSONB rich content fields.
 */
@Entity
@Table(
    name = "job_intro_contents",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_job_intro_contents_category_locale", columnNames = ["category_id", "locale"])
    ]
)
class JobIntroContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "category_id", nullable = false)
    var categoryId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    var category: JobCategory? = null

    @Column(name = "locale", length = 10, nullable = false)
    var locale: String = "ko"   // ko | en | vi

    @Column(name = "title", length = 300, nullable = false)
    var title: String = ""

    @Column(name = "subtitle", length = 500)
    var subtitle: String? = null

    @Column(name = "body", columnDefinition = "text", nullable = false)
    var body: String = ""

    @Column(name = "hero_image_url", length = 500)
    var heroImageUrl: String? = null

    @Column(name = "is_published", nullable = false)
    var isPublished: Boolean = false

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    // added in V2
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null

    val isDeleted: Boolean get() = deletedAt != null

    // added in V7
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "work_characteristics", columnDefinition = "jsonb", nullable = false)
    var workCharacteristics: List<ContentSection> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "related_skills", columnDefinition = "jsonb", nullable = false)
    var relatedSkills: List<SkillEntry> = emptyList()

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pricing_notes", columnDefinition = "jsonb")
    var pricingNotes: List<PricingNote>? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content_images", columnDefinition = "jsonb", nullable = false)
    var contentImages: List<ContentImage> = emptyList()

    @Column(name = "meta_description", length = 300)
    var metaDescription: String? = null

    @Column(name = "reading_time_min")
    var readingTimeMin: Int? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class ContentSection(
    val title: String = "",
    val description: String = "",
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class SkillEntry(
    val name: String = "",
    val level: String = "필수",  // 필수 | 권장 | 선택 | 고급
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class PricingNote(
    val type: String = "DAILY",   // DAILY | HOURLY | MONTHLY
    val minAmount: Int = 0,
    val maxAmount: Int = 0,
    val note: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class ContentImage(
    val url: String = "",
    val caption: String? = null,
    val altText: String? = null,
)
