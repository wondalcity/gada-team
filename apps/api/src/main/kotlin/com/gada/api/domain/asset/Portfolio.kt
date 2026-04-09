package com.gada.api.domain.asset

import com.gada.api.common.BaseEntity
import jakarta.persistence.*

@Entity
@Table(name = "portfolios")
class Portfolio : BaseEntity() {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "owner_type", length = 10, nullable = false)
    var ownerType: String = "WORKER"   // "WORKER" | "TEAM"

    @Column(name = "worker_profile_id")
    var workerProfileId: Long? = null

    @Column(name = "team_id")
    var teamId: Long? = null

    @Column(name = "title", length = 300, nullable = false)
    var title: String = ""

    @Column(name = "description", columnDefinition = "text")
    var description: String? = null

    @Column(name = "location", length = 500)
    var location: String? = null

    @Column(name = "start_date")
    var startDate: java.time.LocalDate? = null

    @Column(name = "end_date")
    var endDate: java.time.LocalDate? = null

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0

    @OneToMany(mappedBy = "portfolio", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var images: MutableList<PortfolioImage> = mutableListOf()
}
