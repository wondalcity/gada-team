package com.gada.api.domain.commission

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(
    name = "hiring_commissions",
    indexes = [
        Index(name = "idx_hiring_commissions_employer", columnList = "employer_id"),
        Index(name = "idx_hiring_commissions_status", columnList = "status"),
    ]
)
class HiringCommission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "employer_id", nullable = false)
    var employerId: Long = 0

    @Column(name = "company_name", length = 200)
    var companyName: String? = null

    @Column(name = "job_id")
    var jobId: Long? = null

    @Column(name = "job_title", length = 200)
    var jobTitle: String? = null

    @Column(name = "worker_name", length = 100)
    var workerName: String? = null

    @Column(name = "contract_id")
    var contractId: Long? = null

    @Column(name = "amount_krw", nullable = false)
    var amountKrw: Long = 0

    @Column(name = "rate_pct", precision = 5, scale = 2)
    var ratePct: BigDecimal? = null

    @Column(name = "status", length = 20, nullable = false)
    var status: String = CommissionStatus.PENDING.name

    @Column(name = "admin_note", columnDefinition = "text")
    var adminNote: String? = null

    @Column(name = "reviewed_by")
    var reviewedBy: Long? = null

    @Column(name = "reviewed_at")
    var reviewedAt: Instant? = null

    @Column(name = "due_date")
    var dueDate: LocalDate? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()

    fun markPaid(adminId: Long, note: String?) {
        status = CommissionStatus.PAID.name
        reviewedBy = adminId
        reviewedAt = Instant.now()
        note?.let { adminNote = it }
    }

    fun waive(adminId: Long, note: String?) {
        status = CommissionStatus.WAIVED.name
        reviewedBy = adminId
        reviewedAt = Instant.now()
        note?.let { adminNote = it }
    }

    val isPending: Boolean get() = status == CommissionStatus.PENDING.name
}

enum class CommissionStatus { PENDING, PAID, WAIVED }
