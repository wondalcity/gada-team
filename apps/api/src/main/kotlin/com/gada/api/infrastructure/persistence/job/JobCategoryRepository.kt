package com.gada.api.infrastructure.persistence.job

import com.gada.api.domain.job.JobCategory
import com.gada.api.domain.job.QJobCategory
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JobCategoryRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val jc = QJobCategory.jobCategory

    fun findAll(isActive: Boolean? = null): List<JobCategory> {
        val query = qf.selectFrom(jc).where(jc.deletedAt.isNull)
        if (isActive != null) {
            query.where(jc.isActive.eq(isActive))
        }
        return query.orderBy(jc.sortOrder.asc()).fetch()
    }

    fun findByCode(code: String): JobCategory? =
        qf.selectFrom(jc)
            .where(jc.code.eq(code), jc.deletedAt.isNull)
            .fetchOne()

    fun findById(id: Long): JobCategory? =
        qf.selectFrom(jc)
            .where(jc.id.eq(id), jc.deletedAt.isNull)
            .fetchOne()

    fun findByPublicId(publicId: UUID): JobCategory? =
        qf.selectFrom(jc)
            .where(jc.publicId.eq(publicId), jc.deletedAt.isNull)
            .fetchOne()

    fun save(category: JobCategory): JobCategory {
        return if (category.id == 0L) {
            em.persist(category)
            em.flush()
            category
        } else {
            val merged = em.merge(category)
            em.flush()
            merged
        }
    }
}
