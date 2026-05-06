package com.gada.api.domain.commission

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "employer_subsidies",
    indexes = [
        Index(name = "idx_employer_subsidies_employer", columnList = "employer_id"),
        Index(name = "idx_employer_subsidies_status", columnList = "status"),
    ]
)
class EmployerSubsidy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "employer_id", nullable = false)
    var employerId: Long = 0

    @Column(name = "company_name", length = 200)
    var companyName: String? = null

    @Column(name = "subsidy_type", length = 50, nullable = false)
    var subsidyType: String = SubsidyType.PLATFORM.name

    @Column(name = "title", length = 200, nullable = false)
    var title: String = ""

    @Column(name = "description", columnDefinition = "text")
    var description: String? = null

    @Column(name = "amount_krw", nullable = false)
    var amountKrw: Long = 0

    @Column(name = "status", length = 20, nullable = false)
    var status: String = SubsidyStatus.PENDING.name

    @Column(name = "admin_note", columnDefinition = "text")
    var adminNote: String? = null

    @Column(name = "reviewed_by")
    var reviewedBy: Long? = null

    @Column(name = "reviewed_at")
    var reviewedAt: Instant? = null

    @Column(name = "disbursed_at")
    var disbursedAt: Instant? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()

    fun approve(adminId: Long, note: String?) {
        status = SubsidyStatus.APPROVED.name
        reviewedBy = adminId
        reviewedAt = Instant.now()
        note?.let { adminNote = it }
    }

    fun reject(adminId: Long, note: String?) {
        status = SubsidyStatus.REJECTED.name
        reviewedBy = adminId
        reviewedAt = Instant.now()
        note?.let { adminNote = it }
    }

    fun disburse(adminId: Long, note: String?) {
        status = SubsidyStatus.DISBURSED.name
        reviewedBy = adminId
        reviewedAt = Instant.now()
        disbursedAt = Instant.now()
        note?.let { adminNote = it }
    }

    val isPending: Boolean get() = status == SubsidyStatus.PENDING.name
    val isApproved: Boolean get() = status == SubsidyStatus.APPROVED.name
}

enum class SubsidyType { GOVERNMENT, PLATFORM }
enum class SubsidyStatus { PENDING, APPROVED, REJECTED, DISBURSED }
