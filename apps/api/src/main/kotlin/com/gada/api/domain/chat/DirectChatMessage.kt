package com.gada.api.domain.chat

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "direct_chat_messages")
class DirectChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "room_id", nullable = false)
    var roomId: Long = 0

    @Column(name = "sender_id", nullable = false)
    var senderId: Long = 0

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    var content: String = ""

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
