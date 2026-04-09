package com.gada.api.domain.company

import com.gada.api.common.BaseEntity
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.time.Instant

@Entity
@Table(
    name = "companies",
    indexes = [
        Index(name = "idx_companies_status", columnList = "status"),
    ]
)
class Company : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "name", length = 200, nullable = false)
    var name: String = ""

    @Column(name = "business_registration_number", length = 20, unique = true)
    var businessRegistrationNumber: String? = null

    @Column(name = "ceo_name", length = 100)
    var ceoName: String? = null

    @Column(name = "address", length = 500)
    var address: String? = null

    @Column(name = "phone", length = 20)
    var phone: String? = null

    @Column(name = "email", length = 200)
    var email: String? = null

    @Column(name = "website_url", length = 500)
    var websiteUrl: String? = null

    @Column(name = "description", columnDefinition = "text")
    var description: String? = null

    @Column(name = "logo_url", length = 500)
    var logoUrl: String? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", length = 20, nullable = false)
    var status: CompanyStatus = CompanyStatus.PENDING

    @Column(name = "verified_at")
    var verifiedAt: Instant? = null

    // ─── V4 additions ────────────────────────────────────────

    @Column(name = "admin_note", columnDefinition = "text")
    var adminNote: String? = null

    @Column(name = "rejection_reason", columnDefinition = "text")
    var rejectionReason: String? = null

    @Column(name = "verified_by")
    var verifiedBy: Long? = null

    // ─── Relationships ───────────────────────────────────────

    @OneToMany(mappedBy = "company", fetch = FetchType.LAZY)
    var sites: MutableList<Site> = mutableListOf()

    // ─── Domain helpers ──────────────────────────────────────

    val isVerified: Boolean get() = verifiedAt != null

    fun verify() {
        status = CompanyStatus.ACTIVE
        verifiedAt = Instant.now()
    }

    fun suspend() {
        status = CompanyStatus.SUSPENDED
    }
}

enum class CompanyStatus {
    PENDING,
    ACTIVE,
    SUSPENDED,
    CLOSED,
}
