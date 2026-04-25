package com.gada.api.infrastructure.persistence.user

import com.gada.api.domain.user.UserStatus
import com.gada.api.domain.user.VisaType
import com.gada.api.domain.user.WorkerProfile
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository

@Repository
class WorkerProfileRepository(
    private val em: EntityManager,
) {
    fun save(profile: WorkerProfile): WorkerProfile =
        if (profile.id == 0L) {
            em.persist(profile); em.flush(); profile
        } else {
            val m = em.merge(profile); em.flush(); m
        }

    fun findByUserId(userId: Long): WorkerProfile? =
        em.createQuery("SELECT wp FROM WorkerProfile wp WHERE wp.userId = :userId", WorkerProfile::class.java)
            .setParameter("userId", userId)
            .resultList
            .firstOrNull()

    fun findByPublicId(publicId: java.util.UUID): WorkerProfile? =
        em.createQuery(
            "SELECT wp FROM WorkerProfile wp JOIN FETCH wp.user u WHERE wp.publicId = :publicId AND wp.isPublic = true",
            WorkerProfile::class.java
        )
            .setParameter("publicId", publicId)
            .resultList
            .firstOrNull()

    fun findAll(
        keyword: String?,
        nationality: String?,
        visaType: VisaType?,
        page: Int,
        size: Int,
    ): Pair<List<WorkerProfile>, Long> {
        val conditions = mutableListOf(
            "wp.isPublic = true",
            "u.status = :status",
        )
        if (!keyword.isNullOrBlank()) conditions.add("LOWER(wp.fullName) LIKE :keyword")
        if (!nationality.isNullOrBlank()) conditions.add("wp.nationality = :nationality")
        if (visaType != null) conditions.add("wp.visaType = :visaType")

        val where = "WHERE ${conditions.joinToString(" AND ")}"

        val countJpql = "SELECT COUNT(wp) FROM WorkerProfile wp JOIN wp.user u $where"
        val dataJpql  = "SELECT wp FROM WorkerProfile wp JOIN FETCH wp.user u $where ORDER BY wp.fullName ASC"

        fun <T> applyParams(q: jakarta.persistence.TypedQuery<T>): jakarta.persistence.TypedQuery<T> {
            q.setParameter("status", UserStatus.ACTIVE)
            if (!keyword.isNullOrBlank()) q.setParameter("keyword", "%${keyword.trim().lowercase()}%")
            if (!nationality.isNullOrBlank()) q.setParameter("nationality", nationality)
            if (visaType != null) q.setParameter("visaType", visaType)
            return q
        }

        val total = applyParams(em.createQuery(countJpql, Long::class.javaObjectType)).singleResult
        val data  = applyParams(em.createQuery(dataJpql, WorkerProfile::class.java))
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(data, total)
    }
}
