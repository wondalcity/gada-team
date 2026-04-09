package com.gada.api.domain.asset

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "equipment_master")
class EquipmentMaster {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "code", length = 50, nullable = false, unique = true)
    var code: String = ""

    @Column(name = "name_ko", length = 200, nullable = false)
    var nameKo: String = ""

    @Column(name = "name_vi", length = 200)
    var nameVi: String? = null

    @Column(name = "name_en", length = 200)
    var nameEn: String? = null

    @Column(name = "category", length = 100)
    var category: String? = null

    @Column(name = "icon_url", length = 500)
    var iconUrl: String? = null

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
}
