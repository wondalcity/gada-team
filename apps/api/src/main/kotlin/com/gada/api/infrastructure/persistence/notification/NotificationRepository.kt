package com.gada.api.infrastructure.persistence.notification

import com.gada.api.domain.notification.Notification
import com.gada.api.domain.notification.NotificationType
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class NotificationRepository(
    private val em: EntityManager,
) {
    fun findByPublicId(publicId: UUID): Notification? =
        em.createQuery(
            "SELECT n FROM Notification n WHERE n.publicId = :publicId AND n.deletedAt IS NULL",
            Notification::class.java
        )
            .setParameter("publicId", publicId)
            .resultList
            .firstOrNull()

    fun findAll(userId: Long? = null, type: NotificationType? = null, page: Int, size: Int): Pair<List<Notification>, Long> {
        val conditions = buildList {
            add("n.deletedAt IS NULL")
            if (userId != null) add("n.userId = :userId")
            if (type != null) add("n.type = :type")
        }
        val whereClause = if (conditions.isEmpty()) "" else "WHERE ${conditions.joinToString(" AND ")}"

        val countQuery = em.createQuery(
            "SELECT COUNT(n) FROM Notification n $whereClause", Long::class.java
        )
        val listQuery = em.createQuery(
            "SELECT n FROM Notification n $whereClause ORDER BY n.createdAt DESC", Notification::class.java
        )

        if (userId != null) {
            countQuery.setParameter("userId", userId)
            listQuery.setParameter("userId", userId)
        }
        if (type != null) {
            countQuery.setParameter("type", type)
            listQuery.setParameter("type", type)
        }

        val total = countQuery.singleResult
        val content = listQuery
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun save(notification: Notification): Notification {
        return if (notification.id == 0L) {
            em.persist(notification)
            em.flush()
            notification
        } else {
            val merged = em.merge(notification)
            em.flush()
            merged
        }
    }

    fun countUnread(userId: Long): Long =
        em.createQuery(
            "SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false AND n.deletedAt IS NULL",
            Long::class.java
        )
            .setParameter("userId", userId)
            .singleResult
}
