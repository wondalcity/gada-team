package com.gada.api.infrastructure.persistence.team

import com.gada.api.domain.team.TeamWorkSchedule
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class TeamWorkScheduleRepository(private val em: EntityManager) {

    fun findByTeamId(teamId: Long): List<TeamWorkSchedule> =
        em.createQuery(
            "SELECT s FROM TeamWorkSchedule s WHERE s.teamId = :teamId ORDER BY s.startDate DESC",
            TeamWorkSchedule::class.java
        ).setParameter("teamId", teamId).resultList

    fun findByPublicId(publicId: UUID): TeamWorkSchedule? =
        em.createQuery(
            "SELECT s FROM TeamWorkSchedule s WHERE s.publicId = :pid",
            TeamWorkSchedule::class.java
        ).setParameter("pid", publicId).resultList.firstOrNull()

    fun save(schedule: TeamWorkSchedule): TeamWorkSchedule {
        val merged = if (schedule.id == 0L) {
            em.persist(schedule); schedule
        } else {
            em.merge(schedule)
        }
        em.flush()
        return merged
    }

    fun delete(schedule: TeamWorkSchedule) {
        val managed = if (em.contains(schedule)) schedule else em.merge(schedule)
        em.remove(managed)
        em.flush()
    }
}
