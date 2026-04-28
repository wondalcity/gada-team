package com.gada.api.domain.chat

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "direct_chat_rooms")
class DirectChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "sender_id", nullable = false)
    var senderId: Long = 0

    @Column(name = "recipient_id", nullable = false)
    var recipientId: Long = 0

    @Column(name = "sender_unread", nullable = false)
    var senderUnread: Int = 0

    @Column(name = "recipient_unread", nullable = false)
    var recipientUnread: Int = 0

    @Column(name = "last_message_at")
    var lastMessageAt: Instant? = null

    @Column(name = "last_message_preview", length = 200)
    var lastMessagePreview: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
