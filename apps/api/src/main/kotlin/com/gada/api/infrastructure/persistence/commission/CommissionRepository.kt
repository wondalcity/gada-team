package com.gada.api.infrastructure.persistence.commission

import com.gada.api.domain.commission.CommissionStatus
import com.gada.api.domain.commission.EmployerSubsidy
import com.gada.api.domain.commission.HiringCommission
import com.gada.api.domain.commission.SubsidyStatus
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class CommissionRepository(private val em: EntityManager) {

    // ── HiringCommission ─────────────────────────────────────

    fun saveCommission(commission: HiringCommission): HiringCommission {
        val merged = if (commission.id == 0L) {
            em.persist(commission); commission
        } else {
            em.merge(commission)
        }
        em.flush()
        return merged
    }

    fun findCommissionByPublicId(publicId: UUID): HiringCommission? =
        em.createQuery(
            "SELECT c FROM HiringCommission c WHERE c.publicId = :pid",
            HiringCommission::class.java
        ).setParameter("pid", publicId).resultList.firstOrNull()

    fun findCommissionsByStatus(
        status: CommissionStatus?,
        page: Int,
        size: Int,
    ): Pair<List<HiringCommission>, Long> {
        val whereClause = if (status != null) "WHERE c.status = :status" else ""
        val items = em.createQuery(
            "SELECT c FROM HiringCommission c $whereClause ORDER BY c.createdAt DESC",
            HiringCommission::class.java
        ).apply {
            if (status != null) setParameter("status", status.name)
            firstResult = page * size
            maxResults = size
        }.resultList

        val total = em.createQuery(
            "SELECT COUNT(c) FROM HiringCommission c $whereClause",
            Long::class.javaObjectType
        ).apply {
            if (status != null) setParameter("status", status.name)
        }.singleResult

        return Pair(items, total)
    }

    fun findCommissionsByEmployerId(
        employerId: Long,
        page: Int,
        size: Int,
    ): Pair<List<HiringCommission>, Long> {
        val items = em.createQuery(
            "SELECT c FROM HiringCommission c WHERE c.employerId = :eid ORDER BY c.createdAt DESC",
            HiringCommission::class.java
        ).setParameter("eid", employerId)
            .also { it.firstResult = page * size; it.maxResults = size }
            .resultList

        val total = em.createQuery(
            "SELECT COUNT(c) FROM HiringCommission c WHERE c.employerId = :eid",
            Long::class.javaObjectType
        ).setParameter("eid", employerId).singleResult

        return Pair(items, total)
    }

    // ── EmployerSubsidy ──────────────────────────────────────

    fun saveSubsidy(subsidy: EmployerSubsidy): EmployerSubsidy {
        val merged = if (subsidy.id == 0L) {
            em.persist(subsidy); subsidy
        } else {
            em.merge(subsidy)
        }
        em.flush()
        return merged
    }

    fun findSubsidyByPublicId(publicId: UUID): EmployerSubsidy? =
        em.createQuery(
            "SELECT s FROM EmployerSubsidy s WHERE s.publicId = :pid",
            EmployerSubsidy::class.java
        ).setParameter("pid", publicId).resultList.firstOrNull()

    fun findSubsidiesByStatus(
        status: SubsidyStatus?,
        page: Int,
        size: Int,
    ): Pair<List<EmployerSubsidy>, Long> {
        val whereClause = if (status != null) "WHERE s.status = :status" else ""
        val items = em.createQuery(
            "SELECT s FROM EmployerSubsidy s $whereClause ORDER BY s.createdAt DESC",
            EmployerSubsidy::class.java
        ).apply {
            if (status != null) setParameter("status", status.name)
            firstResult = page * size
            maxResults = size
        }.resultList

        val total = em.createQuery(
            "SELECT COUNT(s) FROM EmployerSubsidy s $whereClause",
            Long::class.javaObjectType
        ).apply {
            if (status != null) setParameter("status", status.name)
        }.singleResult

        return Pair(items, total)
    }

    fun findSubsidiesByEmployerId(
        employerId: Long,
        page: Int,
        size: Int,
    ): Pair<List<EmployerSubsidy>, Long> {
        val items = em.createQuery(
            "SELECT s FROM EmployerSubsidy s WHERE s.employerId = :eid ORDER BY s.createdAt DESC",
            EmployerSubsidy::class.java
        ).setParameter("eid", employerId)
            .also { it.firstResult = page * size; it.maxResults = size }
            .resultList

        val total = em.createQuery(
            "SELECT COUNT(s) FROM EmployerSubsidy s WHERE s.employerId = :eid",
            Long::class.javaObjectType
        ).setParameter("eid", employerId).singleResult

        return Pair(items, total)
    }
}
