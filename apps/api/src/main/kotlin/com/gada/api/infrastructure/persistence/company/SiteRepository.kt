package com.gada.api.infrastructure.persistence.company

import com.gada.api.domain.company.QSite
import com.gada.api.domain.company.Site
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class SiteRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val s = QSite.site

    fun findById(id: Long): Site? =
        qf.selectFrom(s)
            .where(s.id.eq(id), s.deletedAt.isNull)
            .fetchOne()

    fun findByPublicId(publicId: UUID): Site? =
        qf.selectFrom(s)
            .where(s.publicId.eq(publicId), s.deletedAt.isNull)
            .fetchOne()

    fun findByCompanyId(companyId: Long): List<Site> =
        qf.selectFrom(s)
            .where(s.companyId.eq(companyId), s.deletedAt.isNull)
            .orderBy(s.createdAt.desc())
            .fetch()

    fun findActiveByCompanyId(companyId: Long): List<Site> = findByCompanyId(companyId)

    fun findAll(page: Int, size: Int): Pair<List<Site>, Long> {
        val total = qf.select(s.id.count())
            .from(s)
            .where(s.deletedAt.isNull)
            .fetchOne() ?: 0L
        val content = qf.selectFrom(s)
            .where(s.deletedAt.isNull)
            .orderBy(s.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()
        return Pair(content, total)
    }

    fun save(site: Site): Site {
        return if (site.id == 0L) {
            em.persist(site)
            em.flush()
            site
        } else {
            val merged = em.merge(site)
            em.flush()
            merged
        }
    }
}
