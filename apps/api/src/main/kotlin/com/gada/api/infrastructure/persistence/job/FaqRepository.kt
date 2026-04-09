package com.gada.api.infrastructure.persistence.job

import com.gada.api.domain.job.Faq
import com.gada.api.domain.job.QFaq
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class FaqRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val f = QFaq.faq

    fun findByCategoryIdAndLocale(categoryId: Long, locale: String): List<Faq> =
        qf.selectFrom(f)
            .where(
                f.categoryId.eq(categoryId),
                f.locale.eq(locale),
                f.isPublished.isTrue,
                f.deletedAt.isNull,
            )
            .orderBy(f.sortOrder.asc())
            .fetch()

    fun findAll(locale: String? = null, categoryId: Long? = null, page: Int, size: Int): Pair<List<Faq>, Long> {
        val query = qf.selectFrom(f).where(f.deletedAt.isNull)
        val countQuery = qf.select(f.id.count()).from(f).where(f.deletedAt.isNull)

        if (!locale.isNullOrBlank()) {
            query.where(f.locale.eq(locale))
            countQuery.where(f.locale.eq(locale))
        }
        if (categoryId != null) {
            query.where(f.categoryId.eq(categoryId))
            countQuery.where(f.categoryId.eq(categoryId))
        }

        val total = countQuery.fetchOne() ?: 0L

        val content = query
            .orderBy(f.sortOrder.asc(), f.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun findByPublicId(publicId: UUID): Faq? =
        qf.selectFrom(f)
            .where(
                f.publicId.eq(publicId),
                f.deletedAt.isNull,
            )
            .fetchOne()

    fun save(faq: Faq): Faq {
        return if (faq.id == 0L) {
            em.persist(faq)
            em.flush()
            faq
        } else {
            val merged = em.merge(faq)
            em.flush()
            merged
        }
    }
}
