package com.gada.api.domain.company

import jakarta.persistence.*

/**
 * Static reference table for Korean administrative regions (시/군/구).
 * Seeded in V1 migration. Rarely changes; no audit fields needed.
 */
@Entity
@Table(
    name = "regions",
    uniqueConstraints = [UniqueConstraint(name = "uq_regions_sido_sigungu", columnNames = ["sido", "sigungu", "dong"])]
)
class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "sido", length = 50, nullable = false)
    var sido: String = ""

    @Column(name = "sigungu", length = 50, nullable = false)
    var sigungu: String = ""

    @Column(name = "dong", length = 50)
    var dong: String? = null

    @Column(name = "code", length = 20, unique = true)
    var code: String? = null
}
