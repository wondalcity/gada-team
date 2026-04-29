package com.gada.api.domain.points

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(
    name = "team_leader_point_accounts",
    indexes = [Index(name = "idx_tl_point_accounts_user_id", columnList = "user_id")]
)
class TeamLeaderPointAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "user_id", nullable = false, unique = true)
    var userId: Long = 0

    @Column(name = "balance", nullable = false)
    var balance: Int = 0

    @Column(name = "total_charged", nullable = false)
    var totalCharged: Int = 0

    @Column(name = "total_used", nullable = false)
    var totalUsed: Int = 0

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    fun addPoints(points: Int) {
        balance += points
        totalCharged += points
        updatedAt = Instant.now()
    }

    fun deductPoint(): Boolean {
        if (balance <= 0) return false
        balance -= 1
        totalUsed += 1
        updatedAt = Instant.now()
        return true
    }

    val hasBalance: Boolean get() = balance > 0
}
