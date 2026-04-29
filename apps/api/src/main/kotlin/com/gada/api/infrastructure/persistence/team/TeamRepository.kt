package com.gada.api.infrastructure.persistence.team

import com.gada.api.domain.team.QTeam
import com.gada.api.domain.team.Team
import com.gada.api.domain.team.TeamStatus
import com.gada.api.domain.team.TeamType
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
        qf.selectFrom(t).where(t.leaderId.eq(leaderId), t.deletedAt.isNull).fetchFirst()

    fun findAllByLeaderId(leaderId: Long): List<Team> =
        qf.selectFrom(t).where(t.leaderId.eq(leaderId), t.deletedAt.isNull).orderBy(t.createdAt.desc()).fetch()

    fun findAll(
        page: Int,
        size: Int,
        status: TeamStatus? = null,
        keyword: String? = null,
        sido: String? = null,
        teamType: TeamType? = null,
        isNationwide: Boolean? = null,
    ): Pair<List<Team>, Long> {
        val conditions = mutableListOf("t.deletedAt IS NULL")
        if (status != null) conditions.add("t.status = :status")
        if (!keyword.isNullOrBlank()) conditions.add("LOWER(t.name) LIKE :keyword")
        if (!sido.isNullOrBlank()) conditions.add("CAST(t.regions AS string) LIKE :sidoPattern")
        if (teamType != null) conditions.add("t.teamType = :teamType")
        if (isNationwide == true) conditions.add("t.isNationwide = true")

        val where = "WHERE ${conditions.joinToString(" AND ")}"
        val countJpql = "SELECT COUNT(t) FROM Team t $where"
        val dataJpql  = "SELECT t FROM Team t LEFT JOIN FETCH t.company $where ORDER BY t.createdAt DESC"

        fun <T> applyParams(q: jakarta.persistence.TypedQuery<T>): jakarta.persistence.TypedQuery<T> {
            if (status != null) q.setParameter("status", status)
            if (!keyword.isNullOrBlank()) q.setParameter("keyword", "%${keyword.trim().lowercase()}%")
            if (!sido.isNullOrBlank()) q.setParameter("sidoPattern", "%${sido}%")
            if (teamType != null) q.setParameter("teamType", teamType)
            return q
        }

        val total = applyParams(em.createQuery(countJpql, Long::class.javaObjectType)).singleResult
        val content = applyParams(em.createQuery(dataJpql, Team::class.java))
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun save(team: Team): Team =
        if (team.id == 0L) {
            em.persist(team); em.flush(); team
        } else {
            val m = em.merge(team); em.flush(); m
        }
}
