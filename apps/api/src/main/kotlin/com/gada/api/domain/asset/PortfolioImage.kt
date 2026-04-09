package com.gada.api.domain.asset

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "portfolio_images")
class PortfolioImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "portfolio_id", nullable = false)
    var portfolioId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", insertable = false, updatable = false)
    var portfolio: Portfolio? = null

    @Column(name = "image_url", length = 500, nullable = false)
    var imageUrl: String = ""

    @Column(name = "caption", length = 200)
    var caption: String? = null

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
}
