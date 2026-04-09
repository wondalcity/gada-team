package com.gada.api.infrastructure.persistence.application

import com.gada.api.domain.application.Application
import com.gada.api.domain.application.ApplicationStatus
import com.gada.api.domain.application.ApplicationType
import com.gada.api.domain.application.QApplication
import com.querydsl.core.BooleanBuilder
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ApplicationRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val a = QApplication.application

    fun save(app: Application): Application {
        return if (app.id == 0L) {
            em.persist(app)
            em.flush()
            app
        } else {
            val merged = em.merge(app)
            em.flush()
            merged
        }
    }

    fun findById(id: Long): Application? =
        qf.selectFrom(a)
            .where(a.id.eq(id))
            .fetchOne()

    fun findByPublicId(publicId: UUID): Application? =
        qf.selectFrom(a)
            .where(a.publicId.eq(publicId))
            .fetchOne()

    fun findByJobIdAndApplicantUserId(jobId: Long, applicantUserId: Long): Application? =
        qf.selectFrom(a)
            .where(
                a.jobId.eq(jobId),
                a.applicantUserId.eq(applicantUserId),
            )
            .fetchOne()

    fun findByJobIdAndTeamId(jobId: Long, teamId: Long): Application? =
        qf.selectFrom(a)
            .where(
                a.jobId.eq(jobId),
                a.teamId.eq(teamId),
            )
            .fetchOne()

    fun findByApplicantUserId(userId: Long, page: Int, size: Int): Pair<List<Application>, Long> {
        val total = qf.select(a.id.count())
            .from(a)
            .where(a.applicantUserId.eq(userId))
            .fetchOne() ?: 0L

        val content = qf.selectFrom(a)
            .where(a.applicantUserId.eq(userId))
            .orderBy(a.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun findByJobId(jobId: Long, status: ApplicationStatus?, page: Int, size: Int): Pair<List<Application>, Long> {
        val pred = BooleanBuilder()
        pred.and(a.jobId.eq(jobId))
        if (status != null) {
            pred.and(a.status.eq(status))
        }

        val total = qf.select(a.id.count())
            .from(a)
            .where(pred)
            .fetchOne() ?: 0L

        val content = qf.selectFrom(a)
            .where(pred)
            .orderBy(a.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun findAll(
        status: ApplicationStatus?,
        applicationType: ApplicationType?,
        jobId: Long?,
        page: Int,
        size: Int,
    ): Pair<List<Application>, Long> {
        val pred = BooleanBuilder()
        if (status != null) pred.and(a.status.eq(status))
        if (applicationType != null) pred.and(a.applicationType.eq(applicationType))
        if (jobId != null) pred.and(a.jobId.eq(jobId))

        val total = qf.select(a.id.count())
            .from(a)
            .where(pred)
            .fetchOne() ?: 0L

        val content = qf.selectFrom(a)
            .where(pred)
            .orderBy(a.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }
}
