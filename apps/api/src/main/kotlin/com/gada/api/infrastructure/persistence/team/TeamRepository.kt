package com.gada.api.infrastructure.persistence.team

import com.gada.api.domain.team.QTeam
import com.gada.api.domain.team.Team
import com.gada.api.domain.team.TeamStatus
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class TeamRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val t = QTeam.team

    fun findByPublicId(publicId: UUID): Team? =
        qf.selectFrom(t).where(t.publicId.eq(publicId), t.deletedAt.isNull).fetchOne()

    fun findById(id: Long): Team? =
        qf.selectFrom(t).where(t.id.eq(id), t.deletedAt.isNull).fetchOne()

    fun findByLeaderId(leaderId: Long): Team? =
        qf.selectFrom(t).where(t.leaderId.eq(leaderId), t.deletedAt.isNull).fetchOne()

    fun findAll(
        page: Int,
        size: Int,
        status: TeamStatus? = null,
        keyword: String? = null,
    ): Pair<List<Team>, Long> {
        val statusPred = status?.let { t.status.eq(it) }
        val keywordPred = keyword?.takeIf { it.isNotBlank() }?.let { t.name.containsIgnoreCase(it) }
        val total = qf.select(t.count()).from(t)
            .where(t.deletedAt.isNull, statusPred, keywordPred).fetchOne() ?: 0L
        val content = qf.selectFrom(t)
            .where(t.deletedAt.isNull, statusPred, keywordPred)
            .orderBy(t.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()
        return Pair(content, total)
    }

    fun save(team: Team): Team =
        if (team.id == 0L) {
            em.persist(team); em.flush(); team
        } else {
            val m = em.merge(team); em.flush(); m
        }
}
