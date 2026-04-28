package com.gada.api.infrastructure.persistence.member

import com.gada.api.domain.member.MemberProposal
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MemberProposalRepository(private val em: EntityManager) {

    fun save(proposal: MemberProposal): MemberProposal {
        return if (proposal.id == 0L) {
            em.persist(proposal); em.flush(); proposal
        } else {
            val r = em.merge(proposal); em.flush(); r
        }
    }

    fun findByPublicId(publicId: UUID): MemberProposal? =
        em.createQuery("SELECT p FROM MemberProposal p WHERE p.publicId = :pid", MemberProposal::class.java)
            .setParameter("pid", publicId).resultList.firstOrNull()

    fun existsByTeamAndProposer(teamPublicId: String, proposerId: Long): Boolean =
        (em.createQuery(
            "SELECT COUNT(p) FROM MemberProposal p WHERE p.teamPublicId = :team AND p.proposerId = :prop",
            Long::class.javaObjectType
        ).setParameter("team", teamPublicId).setParameter("prop", proposerId).singleResult) > 0

    fun findByLeader(leaderId: Long, page: Int, size: Int): Pair<List<MemberProposal>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(p) FROM MemberProposal p WHERE p.teamLeaderId = :lid",
            Long::class.javaObjectType
        ).setParameter("lid", leaderId).singleResult

        val content = em.createQuery(
            "SELECT p FROM MemberProposal p WHERE p.teamLeaderId = :lid ORDER BY p.createdAt DESC",
            MemberProposal::class.java
        ).setParameter("lid", leaderId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    fun findByProposer(proposerId: Long, page: Int, size: Int): Pair<List<MemberProposal>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(p) FROM MemberProposal p WHERE p.proposerId = :pid",
            Long::class.javaObjectType
        ).setParameter("pid", proposerId).singleResult

        val content = em.createQuery(
            "SELECT p FROM MemberProposal p WHERE p.proposerId = :pid ORDER BY p.createdAt DESC",
            MemberProposal::class.java
        ).setParameter("pid", proposerId)
            .setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    /** Get proposer name from worker_profiles */
    fun findProposerName(userId: Long): String? =
        em.createQuery(
            "SELECT wp.fullName FROM WorkerProfile wp WHERE wp.userId = :uid",
            String::class.java
        ).setParameter("uid", userId).resultList.firstOrNull()

    /** Get team leader_id from teams table */
    fun findTeamLeaderId(teamPublicId: String): Long? {
        return try {
            (em.createNativeQuery(
                "SELECT leader_id FROM teams WHERE CAST(public_id AS VARCHAR) = :pid AND deleted_at IS NULL"
            ).setParameter("pid", teamPublicId).singleResult as Number).toLong()
        } catch (e: Exception) { null }
    }
}
