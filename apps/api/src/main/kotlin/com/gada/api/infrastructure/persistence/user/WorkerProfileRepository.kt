package com.gada.api.infrastructure.persistence.user

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
}
