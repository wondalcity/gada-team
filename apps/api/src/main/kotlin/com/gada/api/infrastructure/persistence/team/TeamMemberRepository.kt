package com.gada.api.infrastructure.persistence.team

import com.gada.api.domain.team.InvitationStatus
import com.gada.api.domain.team.QTeamMember
import com.gada.api.domain.team.TeamMember
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository

@Repository
class TeamMemberRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val tm = QTeamMember.teamMember

    fun findById(id: Long): TeamMember? =
        qf.selectFrom(tm).where(tm.id.eq(id)).fetchOne()

    fun findActiveByTeamId(teamId: Long): List<TeamMember> =
        qf.selectFrom(tm)
            .where(tm.teamId.eq(teamId), tm.leftAt.isNull, tm.invitationStatus.eq(InvitationStatus.ACCEPTED))
            .orderBy(tm.joinedAt.asc())
            .fetch()

    fun findAllByTeamId(teamId: Long): List<TeamMember> =
        qf.selectFrom(tm).where(tm.teamId.eq(teamId)).orderBy(tm.joinedAt.asc()).fetch()

    fun findPendingByUserId(userId: Long): List<TeamMember> =
        qf.selectFrom(tm)
            .where(tm.userId.eq(userId), tm.invitationStatus.eq(InvitationStatus.PENDING))
            .fetch()

    fun findActiveByUserId(userId: Long): List<TeamMember> =
        qf.selectFrom(tm)
            .where(tm.userId.eq(userId), tm.leftAt.isNull, tm.invitationStatus.eq(InvitationStatus.ACCEPTED))
            .fetch()

    fun findByTeamIdAndUserId(teamId: Long, userId: Long): TeamMember? =
        qf.selectFrom(tm).where(tm.teamId.eq(teamId), tm.userId.eq(userId)).fetchOne()

    fun save(member: TeamMember): TeamMember =
        if (member.id == 0L) {
            em.persist(member); em.flush(); member
        } else {
            val m = em.merge(member); em.flush(); m
        }
}
