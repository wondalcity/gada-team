package com.gada.api.infrastructure.persistence.user

import com.gada.api.domain.user.QUser
import com.gada.api.domain.user.User
import com.gada.api.domain.user.UserRole
import com.gada.api.domain.user.UserStatus
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class UserRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val u = QUser.user

    fun findByFirebaseUid(uid: String): User? =
        qf.selectFrom(u).where(u.firebaseUid.eq(uid)).fetchOne()

    fun findByPhone(phone: String): User? =
        qf.selectFrom(u).where(u.phone.eq(phone)).fetchOne()

    fun findByEmail(email: String): User? =
        qf.selectFrom(u).where(u.email.eq(email)).fetchOne()

    fun findById(id: Long): User? =
        qf.selectFrom(u).where(u.id.eq(id)).fetchOne()

    fun findByPublicId(publicId: UUID): User? =
        qf.selectFrom(u).where(u.publicId.eq(publicId)).fetchOne()

    fun findAllByIds(ids: List<Long>): List<User> {
        if (ids.isEmpty()) return emptyList()
        return qf.selectFrom(u).where(u.id.`in`(ids)).fetch()
    }

    fun findAdmins(page: Int, size: Int): Pair<List<User>, Long> {
        val total = qf.select(u.count()).from(u)
            .where(u.role.eq(UserRole.ADMIN)).fetchOne() ?: 0L
        val content = qf.selectFrom(u)
            .where(u.role.eq(UserRole.ADMIN))
            .orderBy(u.id.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()
        return Pair(content, total)
    }

    fun save(user: User): User {
        em.persist(user)
        em.flush()
        return user
    }

    fun saveAndFlush(user: User): User {
        if (em.contains(user)) {
            em.flush()
        } else {
            em.merge(user)
            em.flush()
        }
        return user
    }

    fun findWorkers(
        page: Int,
        size: Int,
        status: UserStatus? = null,
        keyword: String? = null,
        role: UserRole? = null,
    ): Pair<List<User>, Long> {
        val workerRoles = if (role != null) listOf(role) else listOf(UserRole.WORKER, UserRole.TEAM_LEADER)
        val rolePred = u.role.`in`(workerRoles)
        val statusPred = status?.let { u.status.eq(it) }
        val keywordPred = keyword?.takeIf { it.isNotBlank() }?.let {
            u.phone.containsIgnoreCase(it)
        }

        val total = qf.select(u.count()).from(u)
            .where(rolePred, statusPred, keywordPred)
            .fetchOne() ?: 0L

        val users = qf.selectFrom(u)
            .where(rolePred, statusPred, keywordPred)
            .orderBy(u.id.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(users, total)
    }
}
