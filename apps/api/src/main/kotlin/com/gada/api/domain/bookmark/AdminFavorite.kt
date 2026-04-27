package com.gada.api.domain.bookmark

import com.gada.api.domain.team.Team
import com.gada.api.domain.user.User
import jakarta.persistence.*
import java.time.Instant

enum class AdminFavoriteTarget { WORKER, TEAM }

@Entity
@Table(name = "admin_favorites")
class AdminFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_user_id", nullable = false)
    lateinit var admin: User

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, columnDefinition = "admin_favorite_target")
    lateinit var targetType: AdminFavoriteTarget

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_worker_id")
    var targetWorker: User? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_team_id")
    var targetTeam: Team? = null

    @Column(name = "note", length = 500)
    var note: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
