package com.gada.api.domain.bookmark

import com.gada.api.domain.job.Job
import com.gada.api.domain.user.User
import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(
    name = "job_bookmarks",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "job_id"])]
)
class JobBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    lateinit var user: User

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    lateinit var job: Job

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
}
