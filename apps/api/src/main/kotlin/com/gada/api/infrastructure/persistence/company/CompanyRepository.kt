package com.gada.api.infrastructure.persistence.company

import com.gada.api.domain.company.Company
import com.gada.api.domain.company.CompanyStatus
import com.gada.api.domain.company.QCompany
import com.gada.api.domain.user.QEmployerProfile
import com.querydsl.core.BooleanBuilder
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class CompanyRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val c = QCompany.company
    private val ep = QEmployerProfile.employerProfile

    fun findById(id: Long): Company? =
        qf.selectFrom(c)
            .where(c.id.eq(id), c.deletedAt.isNull)
            .fetchOne()

    fun findByPublicId(publicId: UUID): Company? =
        qf.selectFrom(c)
            .where(c.publicId.eq(publicId), c.deletedAt.isNull)
            .fetchOne()

    fun findByEmployerUserId(userId: Long): Company? =
        qf.selectFrom(c)
            .join(ep).on(ep.companyId.eq(c.id), ep.userId.eq(userId))
            .where(c.deletedAt.isNull)
            .fetchOne()

    fun findAll(page: Int, size: Int, keyword: String? = null, status: CompanyStatus? = null): Pair<List<Company>, Long> {
        val pred = BooleanBuilder().and(c.deletedAt.isNull)
        if (!keyword.isNullOrBlank()) pred.and(c.name.containsIgnoreCase(keyword))
        if (status != null) pred.and(c.status.eq(status))
        val total = qf.select(c.id.count()).from(c).where(pred).fetchOne() ?: 0L
        val content = qf.selectFrom(c)
            .where(pred)
            .orderBy(c.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()
        return Pair(content, total)
    }

    fun findAllActive(page: Int, size: Int): Pair<List<Company>, Long> = findAll(page, size)

    fun save(company: Company): Company {
        return if (company.id == 0L) {
            em.persist(company)
            em.flush()
            company
        } else {
            val merged = em.merge(company)
            em.flush()
            merged
        }
    }
}
