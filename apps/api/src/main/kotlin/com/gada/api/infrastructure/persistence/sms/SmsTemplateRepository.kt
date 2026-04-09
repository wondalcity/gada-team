package com.gada.api.infrastructure.persistence.sms

import com.gada.api.domain.notification.SmsTemplate
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class SmsTemplateRepository(
    private val em: EntityManager,
) {
    fun findAll(isActive: Boolean? = null, page: Int, size: Int): Pair<List<SmsTemplate>, Long> {
        val whereClause = buildString {
            append("WHERE t.deletedAt IS NULL")
            if (isActive != null) append(" AND t.isActive = :isActive")
        }

        val countQuery = em.createQuery(
            "SELECT COUNT(t) FROM SmsTemplate t $whereClause", Long::class.java
        )
        val listQuery = em.createQuery(
            "SELECT t FROM SmsTemplate t $whereClause ORDER BY t.createdAt DESC", SmsTemplate::class.java
        )

        if (isActive != null) {
            countQuery.setParameter("isActive", isActive)
            listQuery.setParameter("isActive", isActive)
        }

        val total = countQuery.singleResult
        val content = listQuery
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun findByPublicId(publicId: UUID): SmsTemplate? =
        em.createQuery(
            "SELECT t FROM SmsTemplate t WHERE t.publicId = :publicId AND t.deletedAt IS NULL",
            SmsTemplate::class.java
        )
            .setParameter("publicId", publicId)
            .resultList
            .firstOrNull()

    fun findByCode(code: String): List<SmsTemplate> =
        em.createQuery(
            "SELECT t FROM SmsTemplate t WHERE t.code = :code AND t.deletedAt IS NULL ORDER BY t.locale",
            SmsTemplate::class.java
        )
            .setParameter("code", code)
            .resultList

    fun save(template: SmsTemplate): SmsTemplate {
        return if (template.id == 0L) {
            em.persist(template)
            em.flush()
            template
        } else {
            val merged = em.merge(template)
            em.flush()
            merged
        }
    }
}
