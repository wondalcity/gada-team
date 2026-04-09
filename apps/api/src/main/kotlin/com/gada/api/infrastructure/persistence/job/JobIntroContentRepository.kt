package com.gada.api.infrastructure.persistence.job

import com.gada.api.domain.job.JobIntroContent
import com.gada.api.domain.job.QJobCategory
import com.gada.api.domain.job.QJobIntroContent
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JobIntroContentRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val jic = QJobIntroContent.jobIntroContent
    private val jc = QJobCategory.jobCategory

    fun findByCategoryAndLocale(categoryId: Long, locale: String): JobIntroContent? =
        qf.selectFrom(jic)
            .where(
                jic.categoryId.eq(categoryId),
                jic.locale.eq(locale),
                jic.deletedAt.isNull,
            )
            .fetchOne()

    fun findByCategoryId(categoryId: Long): List<JobIntroContent> =
        qf.selectFrom(jic)
            .where(
                jic.categoryId.eq(categoryId),
                jic.deletedAt.isNull,
            )
            .fetch()

    fun findAll(isPublished: Boolean? = null, page: Int, size: Int): Pair<List<JobIntroContent>, Long> {
        val query = qf.selectFrom(jic)
            .leftJoin(jic.category, jc).fetchJoin()
            .where(jic.deletedAt.isNull)

        val countQuery = qf.select(jic.id.count())
            .from(jic)
            .where(jic.deletedAt.isNull)

        if (isPublished != null) {
            query.where(jic.isPublished.eq(isPublished))
            countQuery.where(jic.isPublished.eq(isPublished))
        }

        val total = countQuery.fetchOne() ?: 0L

        val content = query
            .orderBy(jic.updatedAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun findByPublicId(publicId: UUID): JobIntroContent? =
        qf.selectFrom(jic)
            .where(
                jic.publicId.eq(publicId),
                jic.deletedAt.isNull,
            )
            .fetchOne()

    fun save(content: JobIntroContent): JobIntroContent {
        return if (content.id == 0L) {
            em.persist(content)
            em.flush()
            content
        } else {
            val merged = em.merge(content)
            em.flush()
            merged
        }
    }
}
