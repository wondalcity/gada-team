package com.gada.api.infrastructure.persistence.points

import com.gada.api.domain.points.ChargeStatus
import com.gada.api.domain.points.EmployerPointAccount
import com.gada.api.domain.points.PointChargeRequest
import com.gada.api.domain.points.TeamProposal
import jakarta.persistence.EntityManager
import jakarta.persistence.NoResultException
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class PointsRepository(private val em: EntityManager) {

    // ── EmployerPointAccount ─────────────────────────────────

    fun findAccountByUserId(userId: Long): EmployerPointAccount? =
        em.createQuery(
            "SELECT a FROM EmployerPointAccount a WHERE a.userId = :uid",
            EmployerPointAccount::class.java
        ).setParameter("uid", userId)
            .resultList.firstOrNull()

    fun findOrCreateAccount(userId: Long): EmployerPointAccount {
        return findAccountByUserId(userId) ?: run {
            val account = EmployerPointAccount().also { it.userId = userId }
            em.persist(account)
            em.flush()
            account
        }
    }

    fun saveAccount(account: EmployerPointAccount): EmployerPointAccount {
        val merged = if (account.id == 0L) {
            em.persist(account); account
        } else {
            em.merge(account)
        }
        em.flush()
        return merged
    }

    // ── PointChargeRequest ──────────────────────────────────

    fun saveChargeRequest(req: PointChargeRequest): PointChargeRequest {
        val merged = if (req.id == 0L) {
            em.persist(req); req
        } else {
            em.merge(req)
        }
        em.flush()
        return merged
    }

    fun findChargeRequestByPublicId(publicId: UUID): PointChargeRequest? =
        em.createQuery(
            "SELECT r FROM PointChargeRequest r WHERE r.publicId = :pid",
            PointChargeRequest::class.java
        ).setParameter("pid", publicId)
            .resultList.firstOrNull()

    fun findChargeRequestsByUserId(
        userId: Long,
        page: Int,
        size: Int,
    ): Pair<List<PointChargeRequest>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(r) FROM PointChargeRequest r WHERE r.userId = :uid",
            Long::class.javaObjectType
        ).setParameter("uid", userId)
            .singleResult

        val content = em.createQuery(
            "SELECT r FROM PointChargeRequest r WHERE r.userId = :uid ORDER BY r.createdAt DESC",
            PointChargeRequest::class.java
        ).setParameter("uid", userId)
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun findChargeRequestsByStatus(
        status: ChargeStatus?,
        page: Int,
        size: Int,
    ): Pair<List<PointChargeRequest>, Long> {
        val where = if (status != null) "WHERE r.status = :status" else ""
        val statusName = status?.name

        val total = em.createQuery(
            "SELECT COUNT(r) FROM PointChargeRequest r $where",
            Long::class.javaObjectType
        ).also { q -> statusName?.let { q.setParameter("status", it) } }
            .singleResult

        val content = em.createQuery(
            "SELECT r FROM PointChargeRequest r $where ORDER BY r.createdAt DESC",
            PointChargeRequest::class.java
        ).also { q -> statusName?.let { q.setParameter("status", it) } }
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    // ── TeamProposal ─────────────────────────────────────────

    fun saveProposal(proposal: TeamProposal): TeamProposal {
        val merged = if (proposal.id == 0L) {
            em.persist(proposal); proposal
        } else {
            em.merge(proposal)
        }
        em.flush()
        return merged
    }

    fun existsProposal(teamPublicId: String, jobPublicId: String, employerId: Long): Boolean =
        (em.createQuery(
            """SELECT COUNT(p) FROM TeamProposal p
               WHERE p.teamPublicId = :team AND p.jobPublicId = :job AND p.employerId = :emp""",
            Long::class.javaObjectType
        ).setParameter("team", teamPublicId)
            .setParameter("job", jobPublicId)
            .setParameter("emp", employerId)
            .singleResult) > 0

    fun findProposalsByEmployer(
        employerId: Long,
        page: Int,
        size: Int,
    ): Pair<List<TeamProposal>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(p) FROM TeamProposal p WHERE p.employerId = :emp",
            Long::class.javaObjectType
        ).setParameter("emp", employerId)
            .singleResult

        val content = em.createQuery(
            "SELECT p FROM TeamProposal p WHERE p.employerId = :emp ORDER BY p.createdAt DESC",
            TeamProposal::class.java
        ).setParameter("emp", employerId)
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun findProposalsByTeamPublicId(
        teamPublicId: String,
        page: Int,
        size: Int,
    ): Pair<List<TeamProposal>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(p) FROM TeamProposal p WHERE p.teamPublicId = :team",
            Long::class.javaObjectType
        ).setParameter("team", teamPublicId)
            .singleResult

        val content = em.createQuery(
            "SELECT p FROM TeamProposal p WHERE p.teamPublicId = :team ORDER BY p.createdAt DESC",
            TeamProposal::class.java
        ).setParameter("team", teamPublicId)
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun findProposalByPublicId(publicId: java.util.UUID): TeamProposal? =
        em.createQuery(
            "SELECT p FROM TeamProposal p WHERE p.publicId = :pid",
            TeamProposal::class.java
        ).setParameter("pid", publicId)
            .resultList.firstOrNull()
}
