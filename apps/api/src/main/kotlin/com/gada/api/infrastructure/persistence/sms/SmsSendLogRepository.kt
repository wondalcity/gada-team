package com.gada.api.infrastructure.persistence.sms

import com.gada.api.domain.notification.SmsSendLog
import com.gada.api.domain.notification.SmsStatus
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
class SmsSendLogRepository(private val em: EntityManager) {

    fun save(log: SmsSendLog): SmsSendLog {
        return if (log.id == 0L) {
            em.persist(log)
            log
        } else {
            em.merge(log)
        }
    }

    fun findByPublicId(publicId: UUID): SmsSendLog? =
        em.createQuery(
            "SELECT l FROM SmsSendLog l WHERE l.publicId = :publicId",
            SmsSendLog::class.java,
        )
            .setParameter("publicId", publicId)
            .resultList
            .firstOrNull()

    fun findAll(
        status: SmsStatus? = null,
        templateCode: String? = null,
        toPhone: String? = null,
        userId: Long? = null,
        page: Int = 0,
        size: Int = 20,
    ): Pair<List<SmsSendLog>, Long> {
        val conditions = mutableListOf("1=1")
        if (status != null) conditions.add("l.status = :status")
        if (templateCode != null) conditions.add("l.templateCode = :templateCode")
        if (toPhone != null) conditions.add("l.toPhone = :toPhone")
        if (userId != null) conditions.add("l.userId = :userId")

        val whereClause = "WHERE ${conditions.joinToString(" AND ")}"

        val countQuery = em.createQuery(
            "SELECT COUNT(l) FROM SmsSendLog l $whereClause",
            Long::class.java,
        )
        val listQuery = em.createQuery(
            "SELECT l FROM SmsSendLog l $whereClause ORDER BY l.createdAt DESC",
            SmsSendLog::class.java,
        )

        if (status != null) {
            countQuery.setParameter("status", status)
            listQuery.setParameter("status", status)
        }
        if (templateCode != null) {
            countQuery.setParameter("templateCode", templateCode)
            listQuery.setParameter("templateCode", templateCode)
        }
        if (toPhone != null) {
            countQuery.setParameter("toPhone", toPhone)
            listQuery.setParameter("toPhone", toPhone)
        }
        if (userId != null) {
            countQuery.setParameter("userId", userId)
            listQuery.setParameter("userId", userId)
        }

        val total = countQuery.singleResult
        val content = listQuery
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun findRetryable(now: Instant, limit: Int = 50): List<SmsSendLog> =
        em.createQuery(
            "SELECT l FROM SmsSendLog l WHERE l.status = :status AND l.nextRetryAt <= :now AND l.attemptCount < l.maxAttempts ORDER BY l.nextRetryAt ASC",
            SmsSendLog::class.java,
        )
            .setParameter("status", SmsStatus.FAILED)
            .setParameter("now", now)
            .setMaxResults(limit)
            .resultList

    fun findScheduledReady(now: Instant, limit: Int = 50): List<SmsSendLog> =
        em.createQuery(
            "SELECT l FROM SmsSendLog l WHERE l.status = :status AND l.scheduledAt IS NOT NULL AND l.scheduledAt <= :now ORDER BY l.scheduledAt ASC",
            SmsSendLog::class.java,
        )
            .setParameter("status", SmsStatus.PENDING)
            .setParameter("now", now)
            .setMaxResults(limit)
            .resultList
}
