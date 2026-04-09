package com.gada.api.domain.user

import com.gada.api.common.BaseEntity
import com.gada.api.domain.company.Company
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType

@Entity
@Table(
    name = "employer_profiles",
    indexes = [
        Index(name = "idx_employer_profiles_company_id", columnList = "company_id"),
    ]
)
class EmployerProfile : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    var user: User? = null

    @Column(name = "company_id")
    var companyId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    var company: Company? = null

    @Column(name = "full_name", length = 100, nullable = false)
    var fullName: String = ""

    @Column(name = "position", length = 100)
    var position: String? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "role", length = 20, nullable = false)
    var role: EmployerRole = EmployerRole.STAFF

    // ─── Domain helpers ──────────────────────────────────────

    val canManageJobs: Boolean
        get() = role == EmployerRole.OWNER || role == EmployerRole.MANAGER
}

enum class EmployerRole {
    OWNER,
    MANAGER,
    STAFF,
}
