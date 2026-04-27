package com.gada.api.domain.points

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "team_proposals",
    indexes = [
        Index(name = "idx_team_proposals_employer", columnList = "employer_id"),
        Index(name = "idx_team_proposals_team", columnList = "team_public_id"),
    ]
)
class TeamProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "team_public_id", length = 100, nullable = false)
    var teamPublicId: String = ""

    @Column(name = "employer_id", nullable = false)
    var employerId: Long = 0

    @Column(name = "job_public_id", length = 100, nullable = false)
    var jobPublicId: String = ""

    @Column(name = "job_title", length = 255)
    var jobTitle: String? = null

    @Column(name = "message", columnDefinition = "text")
    var message: String? = null

    @Column(name = "points_used", nullable = false)
    var pointsUsed: Int = 1

    @Column(name = "status", length = 20, nullable = false)
    var status: String = ProposalStatus.PENDING.name

    @Column(name = "responded_at")
    var respondedAt: Instant? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}

enum class ProposalStatus { PENDING, ACCEPTED, DECLINED, EXPIRED }
