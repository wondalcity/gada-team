package com.gada.api.infrastructure.persistence.chat

import com.gada.api.domain.chat.ChatMessage
import com.gada.api.domain.chat.ChatRoom
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ChatRepository(private val em: EntityManager) {

    // ── ChatRoom ─────────────────────────────────────────────

    fun saveRoom(room: ChatRoom): ChatRoom {
        return if (room.id == 0L) {
            em.persist(room); em.flush(); room
        } else {
            val r = em.merge(room); em.flush(); r
        }
    }

    fun findRoomById(id: Long): ChatRoom? =
        em.find(ChatRoom::class.java, id)

    fun findRoomByPublicId(publicId: UUID): ChatRoom? =
        em.createQuery("SELECT r FROM ChatRoom r WHERE r.publicId = :pid", ChatRoom::class.java)
            .setParameter("pid", publicId)
            .resultList.firstOrNull()

    fun findRoomByEmployerAndTeam(employerId: Long, teamPublicId: String): ChatRoom? =
        em.createQuery(
            "SELECT r FROM ChatRoom r WHERE r.employerId = :emp AND r.teamPublicId = :team",
            ChatRoom::class.java
        ).setParameter("emp", employerId)
            .setParameter("team", teamPublicId)
            .resultList.firstOrNull()

    fun findRoomsByEmployer(employerId: Long, page: Int, size: Int): Pair<List<ChatRoom>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(r) FROM ChatRoom r WHERE r.employerId = :emp",
            Long::class.javaObjectType
        ).setParameter("emp", employerId).singleResult

        val content = em.createQuery(
            "SELECT r FROM ChatRoom r WHERE r.employerId = :emp ORDER BY COALESCE(r.lastMessageAt, r.createdAt) DESC",
            ChatRoom::class.java
        ).setParameter("emp", employerId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    fun findRoomsByLeader(leaderId: Long, page: Int, size: Int): Pair<List<ChatRoom>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(r) FROM ChatRoom r WHERE r.teamLeaderId = :lid",
            Long::class.javaObjectType
        ).setParameter("lid", leaderId).singleResult

        val content = em.createQuery(
            "SELECT r FROM ChatRoom r WHERE r.teamLeaderId = :lid ORDER BY COALESCE(r.lastMessageAt, r.createdAt) DESC",
            ChatRoom::class.java
        ).setParameter("lid", leaderId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    // ── ChatMessage ──────────────────────────────────────────

    fun saveMessage(msg: ChatMessage): ChatMessage {
        em.persist(msg); em.flush(); return msg
    }

    fun findMessagesByRoom(roomId: Long, page: Int, size: Int): Pair<List<ChatMessage>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(m) FROM ChatMessage m WHERE m.roomId = :rid",
            Long::class.javaObjectType
        ).setParameter("rid", roomId).singleResult

        val content = em.createQuery(
            "SELECT m FROM ChatMessage m WHERE m.roomId = :rid ORDER BY m.createdAt ASC",
            ChatMessage::class.java
        ).setParameter("rid", roomId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    // ── Team lookup ──────────────────────────────────────────

    /** Returns (id, leaderId, name) from teams table by public_id string */
    fun findTeamInfo(teamPublicId: String): Triple<Long, Long, String>? {
        return try {
            val result = em.createNativeQuery(
                "SELECT id, leader_id, name FROM teams WHERE CAST(public_id AS VARCHAR) = :pid AND deleted_at IS NULL"
            ).setParameter("pid", teamPublicId)
                .singleResult as Array<*>
            Triple(
                (result[0] as Number).toLong(),
                (result[1] as Number).toLong(),
                result[2] as String
            )
        } catch (e: Exception) { null }
    }

    /** Get employer display name from employer_profiles */
    fun findEmployerName(employerId: Long): String? =
        em.createQuery(
            "SELECT ep.fullName FROM EmployerProfile ep WHERE ep.userId = :uid",
            String::class.java
        ).setParameter("uid", employerId).resultList.firstOrNull()

    /** Get worker/leader display name from worker_profiles */
    fun findWorkerName(userId: Long): String? =
        em.createQuery(
            "SELECT wp.fullName FROM WorkerProfile wp WHERE wp.userId = :uid",
            String::class.java
        ).setParameter("uid", userId).resultList.firstOrNull()
}
