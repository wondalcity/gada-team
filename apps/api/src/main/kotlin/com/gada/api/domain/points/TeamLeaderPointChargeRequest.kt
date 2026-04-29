package com.gada.api.domain.points

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "team_leader_point_charge_requests",
    indexes = [
        Index(name = "idx_tl_point_charge_user", columnList = "user_id"),
        Index(name = "idx_tl_point_charge_status", columnList = "status"),
    ]
)
class TeamLeaderPointChargeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0

    @Column(name = "amount_krw", nullable = false)
    var amountKrw: Int = 0

    @Column(name = "points_to_add", nullable = false)
    var pointsToAdd: Int = 0

    @Column(name = "payment_method", length = 20, nullable = false)
    var paymentMethod: String = ""

    @Column(name = "status", length = 20, nullable = false)
    var status: String = ChargeStatus.PENDING.name

    @Column(name = "admin_note", columnDefinition = "text")
    var adminNote: String? = null

    @Column(name = "reviewed_at")
    var reviewedAt: Instant? = null

    @Column(name = "toss_payment_key", length = 200)
    var tossPaymentKey: String? = null

    @Column(name = "toss_order_id", length = 100)
    var tossOrderId: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()

    val isPending: Boolean get() = status == ChargeStatus.PENDING.name
}
