package com.gada.api.infrastructure.persistence.job

import com.gada.api.domain.company.QSite
import com.gada.api.domain.job.Job
import com.gada.api.domain.job.JobStatus
import com.gada.api.domain.job.QJob
import com.gada.api.domain.user.PayUnit
import com.querydsl.core.BooleanBuilder
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JobRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val j = QJob.job
    private val s = QSite.site

    fun findById(id: Long): Job? =
        qf.selectFrom(j)
            .where(j.id.eq(id), j.deletedAt.isNull)
            .fetchOne()

    fun findByPublicId(publicId: UUID): Job? =
        qf.selectFrom(j)
            .where(j.publicId.eq(publicId), j.deletedAt.isNull)
            .fetchOne()

    fun findPublished(
        keyword: String?,
        sido: String?,
        sigungu: String?,
        categoryId: Long?,
        payUnit: String?,
        payMin: Int?,
        payMax: Int?,
        healthCheckRequired: Boolean?,
        lat: Double?,
        lng: Double?,
        radiusKm: Double?,
        page: Int,
        size: Int,
    ): Pair<List<Job>, Long> {
        val conditions = BooleanBuilder()
        conditions.and(j.status.eq(JobStatus.PUBLISHED))
        conditions.and(j.deletedAt.isNull)

        if (!keyword.isNullOrBlank()) {
            conditions.and(j.title.containsIgnoreCase(keyword))
        }
        if (categoryId != null) {
            conditions.and(j.jobCategoryId.eq(categoryId))
        }
        if (!payUnit.isNullOrBlank()) {
            runCatching { PayUnit.valueOf(payUnit) }.getOrNull()?.let {
                conditions.and(j.payUnit.eq(it))
            }
        }
        if (payMin != null) {
            conditions.and(j.payMax.goe(payMin).or(j.payMax.isNull))
        }
        if (payMax != null) {
            conditions.and(j.payMin.loe(payMax).or(j.payMin.isNull))
        }
        if (healthCheckRequired == true) {
            conditions.and(j.healthCheckRequired.isTrue)
        }

        val needsSiteJoin = !sido.isNullOrBlank() || !sigungu.isNullOrBlank() || (lat != null && lng != null && radiusKm != null)

        if (needsSiteJoin) {
            val siteConditions = BooleanBuilder()
            if (!sido.isNullOrBlank()) {
                siteConditions.and(
                    s.sido.eq(sido).or(s.region.sido.eq(sido))
                )
            }
            if (!sigungu.isNullOrBlank()) {
                siteConditions.and(
                    s.sigungu.eq(sigungu).or(s.region.sigungu.eq(sigungu))
                )
            }

            if (lat != null && lng != null && radiusKm != null) {
                val bbox = com.gada.api.common.GeoUtils.boundingBox(lat, lng, radiusKm)
                siteConditions.and(s.latitude.between(
                    java.math.BigDecimal.valueOf(bbox.minLat),
                    java.math.BigDecimal.valueOf(bbox.maxLat),
                ))
                siteConditions.and(s.longitude.between(
                    java.math.BigDecimal.valueOf(bbox.minLng),
                    java.math.BigDecimal.valueOf(bbox.maxLng),
                ))
            }

            val total = qf.select(j.id.count())
                .from(j)
                .join(s).on(s.id.eq(j.siteId))
                .where(conditions, siteConditions)
                .fetchOne() ?: 0L

            val content = qf.selectFrom(j)
                .join(s).on(s.id.eq(j.siteId))
                .where(conditions, siteConditions)
                .orderBy(j.publishedAt.desc())
                .offset((page * size).toLong())
                .limit(size.toLong())
                .fetch()

            return Pair(content, total)
        }

        val total = qf.select(j.id.count())
            .from(j)
            .where(conditions)
            .fetchOne() ?: 0L

        val content = qf.selectFrom(j)
            .where(conditions)
            .orderBy(j.publishedAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun findByCompanyId(companyId: Long, page: Int, size: Int): Pair<List<Job>, Long> {
        val conditions = BooleanBuilder()
        conditions.and(j.companyId.eq(companyId))
        conditions.and(j.deletedAt.isNull)

        val total = qf.select(j.id.count())
            .from(j)
            .where(conditions)
            .fetchOne() ?: 0L

        val content = qf.selectFrom(j)
            .where(conditions)
            .orderBy(j.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun findAllForAdmin(page: Int, size: Int, keyword: String? = null, status: JobStatus? = null, categoryId: Long? = null): Pair<List<Job>, Long> {
        val pred = BooleanBuilder()
        if (!keyword.isNullOrBlank()) pred.and(j.title.containsIgnoreCase(keyword))
        if (status != null) pred.and(j.status.eq(status))
        if (categoryId != null) pred.and(j.jobCategoryId.eq(categoryId))

        val total = qf.select(j.id.count()).from(j).where(pred).fetchOne() ?: 0L
        val content = qf.selectFrom(j)
            .where(pred)
            .orderBy(j.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()
        return Pair(content, total)
    }

    /** 스케쥴 등록용 — 마감된 공고 포함, 현장 정보 함께 로드 */
    fun findForScheduleSearch(keyword: String, page: Int, size: Int): List<Job> {
        val kw = keyword.lowercase()
        val jpql = buildString {
            append("SELECT j FROM Job j LEFT JOIN FETCH j.site")
            append(" WHERE j.deletedAt IS NULL AND j.status <> 'DRAFT'")
            if (kw.isNotBlank()) append(" AND (LOWER(j.title) LIKE :kw OR LOWER(j.site.name) LIKE :kw)")
            append(" ORDER BY j.createdAt DESC")
        }
        return em.createQuery(jpql, Job::class.java).apply {
            if (kw.isNotBlank()) setParameter("kw", "%$kw%")
            firstResult = page * size
            maxResults = size
        }.resultList
    }

    fun save(job: Job): Job {
        return if (job.id == 0L) {
            em.persist(job)
            em.flush()
            job
        } else {
            val merged = em.merge(job)
            em.flush()
            merged
        }
    }
}
