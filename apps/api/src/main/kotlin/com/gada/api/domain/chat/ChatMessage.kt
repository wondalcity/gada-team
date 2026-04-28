package com.gada.api.domain.chat

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "chat_messages",
    indexes = [Index(name = "idx_chat_messages_room", columnList = "room_id,created_at")]
)
class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "room_id", nullable = false)
    var roomId: Long = 0

    @Column(name = "sender_id", nullable = false)
    var senderId: Long = 0

    @Column(name = "content", columnDefinition = "text", nullable = false)
    var content: String = ""

    @Column(name = "message_type", nullable = false, length = 20)
    var messageType: String = "TEXT"

    @Column(name = "contract_public_id", columnDefinition = "uuid")
    var contractPublicId: java.util.UUID? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
