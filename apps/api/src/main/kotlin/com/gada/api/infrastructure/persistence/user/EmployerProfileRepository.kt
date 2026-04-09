package com.gada.api.infrastructure.persistence.user

import com.gada.api.domain.user.EmployerProfile
import com.gada.api.domain.user.QEmployerProfile
import com.gada.api.domain.user.QUser
import com.gada.api.domain.user.UserStatus
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class EmployerProfileRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val ep = QEmployerProfile.employerProfile
    private val u = QUser.user

    fun findByUserId(userId: Long): EmployerProfile? =
        qf.selectFrom(ep)
            .where(ep.userId.eq(userId))
            .fetchOne()

    fun findByUserPublicId(publicId: UUID): EmployerProfile? =
        qf.selectFrom(ep)
            .join(u).on(u.id.eq(ep.userId))
            .where(u.publicId.eq(publicId))
            .fetchOne()

    fun findAll(page: Int, size: Int, status: UserStatus? = null): Pair<List<EmployerProfile>, Long> {
        val statusPred = status?.let { u.status.eq(it) }

        val total = qf.select(ep.id.count())
            .from(ep)
            .join(u).on(u.id.eq(ep.userId))
            .where(statusPred)
            .fetchOne() ?: 0L

        val content = qf.selectFrom(ep)
            .join(u).on(u.id.eq(ep.userId))
            .where(statusPred)
            .orderBy(ep.id.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun save(profile: EmployerProfile): EmployerProfile {
        return if (profile.id == 0L) {
            em.persist(profile)
            em.flush()
            profile
        } else {
            val merged = em.merge(profile)
            em.flush()
            merged
        }
    }
}
