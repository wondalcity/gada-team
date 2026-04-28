package com.gada.api.domain.chat

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "chat_rooms",
    indexes = [
        Index(name = "idx_chat_rooms_employer", columnList = "employer_id"),
        Index(name = "idx_chat_rooms_leader", columnList = "team_leader_id"),
    ]
)
class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "employer_id", nullable = false)
    var employerId: Long = 0

    @Column(name = "team_public_id", length = 100, nullable = false)
    var teamPublicId: String = ""

    @Column(name = "team_leader_id", nullable = false)
    var teamLeaderId: Long = 0

    @Column(name = "team_name", length = 255)
    var teamName: String? = null

    @Column(name = "points_used", nullable = false)
    var pointsUsed: Int = 1

    @Column(name = "employer_unread", nullable = false)
    var employerUnread: Int = 0

    @Column(name = "leader_unread", nullable = false)
    var leaderUnread: Int = 0

    @Column(name = "last_message_at")
    var lastMessageAt: Instant? = null

    @Column(name = "last_message_preview", length = 200)
    var lastMessagePreview: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
