package com.gada.api.domain.member

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "member_proposals",
    indexes = [
        Index(name = "idx_member_proposals_leader", columnList = "team_leader_id"),
        Index(name = "idx_member_proposals_proposer", columnList = "proposer_id"),
    ]
)
class MemberProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "team_public_id", length = 100, nullable = false)
    var teamPublicId: String = ""

    @Column(name = "team_leader_id", nullable = false)
    var teamLeaderId: Long = 0

    @Column(name = "proposer_id", nullable = false)
    var proposerId: Long = 0

    @Column(name = "message", columnDefinition = "text")
    var message: String? = null

    @Column(name = "status", length = 20, nullable = false)
    var status: String = "PENDING"

    @Column(name = "responded_at")
    var respondedAt: Instant? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
