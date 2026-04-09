package com.gada.api.domain.company

import com.gada.api.common.BaseEntity
import com.gada.api.domain.job.Job
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.math.BigDecimal
import java.time.LocalDate

@Entity
@Table(
    name = "sites",
    indexes = [
        Index(name = "idx_sites_company_id", columnList = "company_id"),
        Index(name = "idx_sites_region_id", columnList = "region_id"),
        Index(name = "idx_sites_status", columnList = "status"),
    ]
)
class Site : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "company_id", nullable = false)
    var companyId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    var company: Company? = null

    @Column(name = "region_id")
    var regionId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id", insertable = false, updatable = false)
    var region: Region? = null

    @Column(name = "name", length = 200, nullable = false)
    var name: String = ""

    @Column(name = "address", length = 500, nullable = false)
    var address: String = ""

    @Column(name = "address_detail", length = 200)
    var addressDetail: String? = null

    @Column(name = "latitude", precision = 10, scale = 8)
    var latitude: BigDecimal? = null

    @Column(name = "longitude", precision = 11, scale = 8)
    var longitude: BigDecimal? = null

    @Column(name = "description", columnDefinition = "text")
    var description: String? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", length = 20, nullable = false)
    var status: SiteStatus = SiteStatus.PLANNING

    @Column(name = "start_date")
    var startDate: LocalDate? = null

    @Column(name = "end_date")
    var endDate: LocalDate? = null

    // ─── V3 additions ────────────────────────────────────────

    @Column(name = "sido", length = 50)
    var sido: String? = null

    @Column(name = "sigungu", length = 50)
    var sigungu: String? = null

    // ─── Relationships ───────────────────────────────────────

    @OneToMany(mappedBy = "site", fetch = FetchType.LAZY)
    var jobs: MutableList<Job> = mutableListOf()

    // ─── Domain helpers ──────────────────────────────────────

    val hasCoordinates: Boolean
        get() = latitude != null && longitude != null

    fun activate() {
        status = SiteStatus.ACTIVE
    }

    fun complete() {
        status = SiteStatus.COMPLETED
    }
}

enum class SiteStatus {
    PLANNING,
    ACTIVE,
    COMPLETED,
    SUSPENDED,
}
