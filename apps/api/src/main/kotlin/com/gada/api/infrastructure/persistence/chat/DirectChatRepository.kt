package com.gada.api.infrastructure.persistence.chat

import com.gada.api.domain.chat.DirectChatMessage
import com.gada.api.domain.chat.DirectChatRoom
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class DirectChatRepository(private val em: EntityManager) {

    // ── Room ─────────────────────────────────────────────────

    fun saveRoom(room: DirectChatRoom): DirectChatRoom =
        if (room.id == 0L) { em.persist(room); em.flush(); room }
        else { val r = em.merge(room); em.flush(); r }

    fun findRoomByPublicId(publicId: UUID): DirectChatRoom? =
        em.createQuery(
            "SELECT r FROM DirectChatRoom r WHERE r.publicId = :pid",
            DirectChatRoom::class.java
        ).setParameter("pid", publicId).resultList.firstOrNull()

    fun findRoomBetween(userA: Long, userB: Long): DirectChatRoom? =
        em.createQuery(
            "SELECT r FROM DirectChatRoom r WHERE (r.senderId = :a AND r.recipientId = :b) OR (r.senderId = :b AND r.recipientId = :a)",
            DirectChatRoom::class.java
        ).setParameter("a", userA).setParameter("b", userB).resultList.firstOrNull()

    fun findRoomsByUser(userId: Long, page: Int, size: Int): Pair<List<DirectChatRoom>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(r) FROM DirectChatRoom r WHERE r.senderId = :uid OR r.recipientId = :uid",
            Long::class.javaObjectType
        ).setParameter("uid", userId).singleResult

        val content = em.createQuery(
            "SELECT r FROM DirectChatRoom r WHERE r.senderId = :uid OR r.recipientId = :uid ORDER BY COALESCE(r.lastMessageAt, r.createdAt) DESC",
            DirectChatRoom::class.java
        ).setParameter("uid", userId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    // ── Message ──────────────────────────────────────────────

    fun saveMessage(msg: DirectChatMessage): DirectChatMessage {
        em.persist(msg); em.flush(); return msg
    }

    fun findMessagesByRoom(roomId: Long, page: Int, size: Int): Pair<List<DirectChatMessage>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(m) FROM DirectChatMessage m WHERE m.roomId = :rid",
            Long::class.javaObjectType
        ).setParameter("rid", roomId).singleResult

        val content = em.createQuery(
            "SELECT m FROM DirectChatMessage m WHERE m.roomId = :rid ORDER BY m.createdAt ASC",
            DirectChatMessage::class.java
        ).setParameter("rid", roomId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    // ── Worker lookup ────────────────────────────────────────

    fun findUserIdByWorkerProfilePublicId(workerProfilePublicId: String): Long? =
        em.createNativeQuery(
            "SELECT user_id FROM worker_profiles WHERE CAST(public_id AS VARCHAR) = :pid AND deleted_at IS NULL"
        ).setParameter("pid", workerProfilePublicId)
            .resultList.firstOrNull()?.let { (it as Number).toLong() }

    fun findWorkerName(userId: Long): String? =
        em.createQuery(
            "SELECT wp.fullName FROM WorkerProfile wp WHERE wp.userId = :uid",
            String::class.java
        ).setParameter("uid", userId).resultList.firstOrNull()

    fun findWorkerProfileImageUrl(userId: Long): String? =
        em.createNativeQuery(
            "SELECT profile_image_url FROM worker_profiles WHERE user_id = :uid AND deleted_at IS NULL"
        ).setParameter("uid", userId).resultList.firstOrNull() as? String
}
