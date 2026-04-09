package com.gada.api.domain.user

import com.gada.api.common.BaseEntity
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType

@Entity
@Table(
    name = "users",
    indexes = [
        Index(name = "idx_users_firebase_uid", columnList = "firebase_uid"),
        Index(name = "idx_users_phone", columnList = "phone"),
    ]
)
class User : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "phone", length = 20, unique = true, nullable = false)
    var phone: String = ""

    @Column(name = "firebase_uid", length = 128, unique = true)
    var firebaseUid: String? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "role", length = 30, nullable = false)
    var role: UserRole = UserRole.WORKER

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", length = 30, nullable = false)
    var status: UserStatus = UserStatus.PENDING

    @Column(name = "admin_role", length = 30)
    var adminRoleStr: String? = null

    val adminRole: AdminRole?
        get() = adminRoleStr?.let { runCatching { AdminRole.valueOf(it) }.getOrNull() }

    // ─── Relationships ───────────────────────────────────────

    @OneToOne(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var workerProfile: WorkerProfile? = null

    @OneToOne(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var employerProfile: EmployerProfile? = null

    // ─── Domain logic ────────────────────────────────────────

    fun activate() {
        status = UserStatus.ACTIVE
    }

    fun suspend() {
        status = UserStatus.SUSPENDED
    }

    fun deactivate() {
        status = UserStatus.INACTIVE
    }

    val isActive: Boolean get() = status == UserStatus.ACTIVE
}
