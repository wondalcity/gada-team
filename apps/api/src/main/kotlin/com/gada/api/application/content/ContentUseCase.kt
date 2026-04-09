package com.gada.api.application.content

import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.domain.job.ContentImage
import com.gada.api.domain.job.ContentSection
import com.gada.api.domain.job.Faq
import com.gada.api.domain.job.JobIntroContent
import com.gada.api.domain.job.PricingNote
import com.gada.api.domain.job.SkillEntry
import com.gada.api.infrastructure.persistence.job.FaqRepository
import com.gada.api.infrastructure.persistence.job.JobCategoryRepository
import com.gada.api.infrastructure.persistence.job.JobIntroContentRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

// ─── Request / Response DTOs ──────────────────────────────────────────────────

data class CategoryListItem(
    val id: Long,
    val publicId: UUID,
    val code: String,
    val nameKo: String,
    val nameEn: String?,
    val nameVi: String?,
    val description: String?,
    val iconUrl: String?,
    val hasContent: Boolean,
)

data class CategoryDetailResponse(
    val publicId: UUID,
    val code: String,
    val nameKo: String,
    val nameEn: String?,
    val nameVi: String?,
    val iconUrl: String?,
    val content: IntroContentResponse?,
    val faqs: List<FaqResponse>,
    val locale: String,
)

data class IntroContentResponse(
    val publicId: UUID,
    val categoryCode: String,
    val locale: String,
    val title: String,
    val subtitle: String?,
    val body: String,
    val heroImageUrl: String?,
    val workCharacteristics: List<ContentSection>,
    val relatedSkills: List<SkillEntry>,
    val pricingNotes: List<PricingNote>?,
    val contentImages: List<ContentImage>,
    val metaDescription: String?,
    val readingTimeMin: Int?,
    val isPublished: Boolean,
    val updatedAt: Instant,
)

data class FaqResponse(
    val publicId: UUID,
    val question: String,
    val answer: String,
    val sortOrder: Int,
    val locale: String,
    val isPublished: Boolean,
)

data class UpsertIntroContentRequest(
    val title: String,
    val subtitle: String?,
    val body: String,
    val heroImageUrl: String?,
    val workCharacteristics: List<ContentSection> = emptyList(),
    val relatedSkills: List<SkillEntry> = emptyList(),
    val pricingNotes: List<PricingNote>? = null,
    val contentImages: List<ContentImage> = emptyList(),
    val metaDescription: String?,
    val readingTimeMin: Int?,
)

data class UpsertFaqRequest(
    val categoryCode: String?,
    val locale: String,
    val question: String,
    val answer: String,
    val sortOrder: Int = 0,
)

data class UpdateCategoryRequest(
    val nameEn: String?,
    val nameVi: String?,
    val descriptionKo: String?,
    val descriptionEn: String?,
    val descriptionVi: String?,
    val iconUrl: String?,
    val isActive: Boolean?,
)

data class AdminCategoryItem(
    val publicId: UUID,
    val code: String,
    val nameKo: String,
    val nameEn: String?,
    val nameVi: String?,
    val iconUrl: String?,
    val isActive: Boolean,
    val contentCount: Int,
)

data class IntroContentListResponse(
    val content: List<IntroContentResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

data class FaqListResponse(
    val content: List<FaqResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

// ─── Service ──────────────────────────────────────────────────────────────────

@Service
@Transactional
class ContentUseCase(
    private val jobCategoryRepository: JobCategoryRepository,
    private val jobIntroContentRepository: JobIntroContentRepository,
    private val faqRepository: FaqRepository,
) {

    // ─── Public reads ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getCategories(locale: String = "ko"): List<CategoryListItem> {
        val categories = jobCategoryRepository.findAll(isActive = true)
        return categories.map { cat ->
            val hasContent = jobIntroContentRepository.findByCategoryAndLocale(cat.id, locale)?.isPublished == true
            CategoryListItem(
                id = cat.id,
                publicId = cat.publicId,
                code = cat.code,
                nameKo = cat.nameKo,
                nameEn = cat.nameEn,
                nameVi = cat.nameVi,
                description = when (locale) {
                    "en" -> cat.descriptionEn ?: cat.descriptionKo
                    "vi" -> cat.descriptionVi ?: cat.descriptionKo
                    else -> cat.descriptionKo
                },
                iconUrl = cat.iconUrl,
                hasContent = hasContent,
            )
        }
    }

    @Transactional(readOnly = true)
    fun getCategoryDetail(code: String, locale: String = "ko"): CategoryDetailResponse {
        val category = jobCategoryRepository.findByCode(code)
            ?: throw NotFoundException("JobCategory", code)

        var introContent = jobIntroContentRepository.findByCategoryAndLocale(category.id, locale)
        if (introContent == null && locale != "ko") {
            introContent = jobIntroContentRepository.findByCategoryAndLocale(category.id, "ko")
        }

        val faqs = faqRepository.findByCategoryIdAndLocale(category.id, locale)

        return CategoryDetailResponse(
            publicId = category.publicId,
            code = category.code,
            nameKo = category.nameKo,
            nameEn = category.nameEn,
            nameVi = category.nameVi,
            iconUrl = category.iconUrl,
            content = introContent?.toResponse(category.code),
            faqs = faqs.map { it.toResponse() },
            locale = locale,
        )
    }

    // ─── Admin: IntroContent ──────────────────────────────────────────────────

    fun createIntroContent(categoryCode: String, locale: String, req: UpsertIntroContentRequest): IntroContentResponse {
        val category = jobCategoryRepository.findByCode(categoryCode)
            ?: throw NotFoundException("JobCategory", categoryCode)

        val existing = jobIntroContentRepository.findByCategoryAndLocale(category.id, locale)
        if (existing != null) {
            throw ConflictException("이미 해당 카테고리/로케일에 콘텐츠가 존재합니다: $categoryCode/$locale")
        }

        val content = JobIntroContent().apply {
            categoryId = category.id
            this.locale = locale
            title = req.title
            subtitle = req.subtitle
            body = req.body
            heroImageUrl = req.heroImageUrl
            workCharacteristics = req.workCharacteristics
            relatedSkills = req.relatedSkills
            pricingNotes = req.pricingNotes
            contentImages = req.contentImages
            metaDescription = req.metaDescription
            readingTimeMin = req.readingTimeMin
        }

        val saved = jobIntroContentRepository.save(content)
        return saved.toResponse(categoryCode)
    }

    fun updateIntroContent(publicId: UUID, req: UpsertIntroContentRequest): IntroContentResponse {
        val content = jobIntroContentRepository.findByPublicId(publicId)
            ?: throw NotFoundException("JobIntroContent", publicId)

        val categoryCode = content.category?.code
            ?: jobCategoryRepository.findById(content.categoryId)?.code
            ?: throw NotFoundException("JobCategory", content.categoryId)

        content.title = req.title
        content.subtitle = req.subtitle
        content.body = req.body
        content.heroImageUrl = req.heroImageUrl
        content.workCharacteristics = req.workCharacteristics
        content.relatedSkills = req.relatedSkills
        content.pricingNotes = req.pricingNotes
        content.contentImages = req.contentImages
        content.metaDescription = req.metaDescription
        content.readingTimeMin = req.readingTimeMin
        content.updatedAt = Instant.now()

        val saved = jobIntroContentRepository.save(content)
        return saved.toResponse(categoryCode)
    }

    fun publishIntroContent(publicId: UUID): IntroContentResponse {
        val content = jobIntroContentRepository.findByPublicId(publicId)
            ?: throw NotFoundException("JobIntroContent", publicId)

        val categoryCode = content.category?.code
            ?: jobCategoryRepository.findById(content.categoryId)?.code
            ?: throw NotFoundException("JobCategory", content.categoryId)

        content.isPublished = true
        content.updatedAt = Instant.now()

        val saved = jobIntroContentRepository.save(content)
        return saved.toResponse(categoryCode)
    }

    fun unpublishIntroContent(publicId: UUID): IntroContentResponse {
        val content = jobIntroContentRepository.findByPublicId(publicId)
            ?: throw NotFoundException("JobIntroContent", publicId)

        val categoryCode = content.category?.code
            ?: jobCategoryRepository.findById(content.categoryId)?.code
            ?: throw NotFoundException("JobCategory", content.categoryId)

        content.isPublished = false
        content.updatedAt = Instant.now()

        val saved = jobIntroContentRepository.save(content)
        return saved.toResponse(categoryCode)
    }

    fun deleteIntroContent(publicId: UUID) {
        val content = jobIntroContentRepository.findByPublicId(publicId)
            ?: throw NotFoundException("JobIntroContent", publicId)

        content.deletedAt = Instant.now()
        jobIntroContentRepository.save(content)
    }

    @Transactional(readOnly = true)
    fun getAdminIntroContents(isPublished: Boolean?, page: Int, size: Int): IntroContentListResponse {
        val (contents, total) = jobIntroContentRepository.findAll(isPublished, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return IntroContentListResponse(
            content = contents.map { c ->
                val catCode = c.category?.code
                    ?: jobCategoryRepository.findById(c.categoryId)?.code ?: ""
                c.toResponse(catCode)
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
        )
    }

    @Transactional(readOnly = true)
    fun getIntroContentByPublicId(publicId: UUID): IntroContentResponse {
        val content = jobIntroContentRepository.findByPublicId(publicId)
            ?: throw NotFoundException("JobIntroContent", publicId)

        val categoryCode = content.category?.code
            ?: jobCategoryRepository.findById(content.categoryId)?.code
            ?: throw NotFoundException("JobCategory", content.categoryId)

        return content.toResponse(categoryCode)
    }

    // ─── Admin: FAQ ───────────────────────────────────────────────────────────

    fun createFaq(req: UpsertFaqRequest): FaqResponse {
        val categoryId = req.categoryCode?.let { code ->
            jobCategoryRepository.findByCode(code)?.id
                ?: throw NotFoundException("JobCategory", code)
        }

        val faq = Faq().apply {
            this.categoryId = categoryId
            locale = req.locale
            question = req.question
            answer = req.answer
            sortOrder = req.sortOrder
        }

        return faqRepository.save(faq).toResponse()
    }

    fun updateFaq(publicId: UUID, req: UpsertFaqRequest): FaqResponse {
        val faq = faqRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Faq", publicId)

        val categoryId = req.categoryCode?.let { code ->
            jobCategoryRepository.findByCode(code)?.id
                ?: throw NotFoundException("JobCategory", code)
        }

        faq.categoryId = categoryId
        faq.locale = req.locale
        faq.question = req.question
        faq.answer = req.answer
        faq.sortOrder = req.sortOrder
        faq.updatedAt = Instant.now()

        return faqRepository.save(faq).toResponse()
    }

    fun deleteFaq(publicId: UUID) {
        val faq = faqRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Faq", publicId)

        faq.softDelete()
        faqRepository.save(faq)
    }

    fun publishFaq(publicId: UUID): FaqResponse {
        val faq = faqRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Faq", publicId)

        faq.isPublished = true
        faq.updatedAt = Instant.now()

        return faqRepository.save(faq).toResponse()
    }

    @Transactional(readOnly = true)
    fun getAdminFaqs(locale: String?, categoryCode: String?, page: Int, size: Int): FaqListResponse {
        val categoryId = categoryCode?.let { code ->
            jobCategoryRepository.findByCode(code)?.id
                ?: throw NotFoundException("JobCategory", code)
        }

        val (faqs, total) = faqRepository.findAll(locale, categoryId, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return FaqListResponse(
            content = faqs.map { it.toResponse() },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
        )
    }

    // ─── Admin: Category ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getAdminCategories(): List<AdminCategoryItem> {
        val categories = jobCategoryRepository.findAll()
        return categories.map { cat ->
            val publishedContents = jobIntroContentRepository.findByCategoryId(cat.id)
                .count { it.isPublished }
            AdminCategoryItem(
                publicId = cat.publicId,
                code = cat.code,
                nameKo = cat.nameKo,
                nameEn = cat.nameEn,
                nameVi = cat.nameVi,
                iconUrl = cat.iconUrl,
                isActive = cat.isActive,
                contentCount = publishedContents,
            )
        }
    }

    fun updateCategory(code: String, req: UpdateCategoryRequest): AdminCategoryItem {
        val category = jobCategoryRepository.findByCode(code)
            ?: throw NotFoundException("JobCategory", code)

        req.nameEn?.let { category.nameEn = it }
        req.nameVi?.let { category.nameVi = it }
        req.descriptionKo?.let { category.descriptionKo = it }
        req.descriptionEn?.let { category.descriptionEn = it }
        req.descriptionVi?.let { category.descriptionVi = it }
        req.iconUrl?.let { category.iconUrl = it }
        req.isActive?.let { category.isActive = it }
        category.updatedAt = Instant.now()

        val saved = jobCategoryRepository.save(category)

        val publishedContents = jobIntroContentRepository.findByCategoryId(saved.id)
            .count { it.isPublished }

        return AdminCategoryItem(
            publicId = saved.publicId,
            code = saved.code,
            nameKo = saved.nameKo,
            nameEn = saved.nameEn,
            nameVi = saved.nameVi,
            iconUrl = saved.iconUrl,
            isActive = saved.isActive,
            contentCount = publishedContents,
        )
    }
}

// ─── Extension helpers ────────────────────────────────────────────────────────

private fun JobIntroContent.toResponse(categoryCode: String) = IntroContentResponse(
    publicId = publicId,
    categoryCode = categoryCode,
    locale = locale,
    title = title,
    subtitle = subtitle,
    body = body,
    heroImageUrl = heroImageUrl,
    workCharacteristics = workCharacteristics,
    relatedSkills = relatedSkills,
    pricingNotes = pricingNotes,
    contentImages = contentImages,
    metaDescription = metaDescription,
    readingTimeMin = readingTimeMin,
    isPublished = isPublished,
    updatedAt = updatedAt,
)

private fun Faq.toResponse() = FaqResponse(
    publicId = publicId,
    question = question,
    answer = answer,
    sortOrder = sortOrder,
    locale = locale,
    isPublished = isPublished,
)
