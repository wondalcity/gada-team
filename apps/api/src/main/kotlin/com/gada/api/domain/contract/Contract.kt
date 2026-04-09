package com.gada.api.domain.contract

import com.gada.api.common.BaseEntity
import com.gada.api.domain.user.PayUnit
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.time.Instant
import java.time.LocalDate

enum class ContractStatus { DRAFT, SENT, SIGNED, EXPIRED, CANCELLED }

@Entity
@Table(name = "contracts")
class Contract : BaseEntity() {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "application_id", nullable = false)
    var applicationId: Long = 0

    @Column(name = "job_id", nullable = false)
    var jobId: Long = 0

    @Column(name = "employer_user_id", nullable = false)
    var employerUserId: Long = 0

    @Column(name = "worker_user_id", nullable = false)
    var workerUserId: Long = 0

    @Column(name = "team_id")
    var teamId: Long? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", columnDefinition = "contract_status", nullable = false)
    var status: ContractStatus = ContractStatus.DRAFT

    @Column(name = "start_date")
    var startDate: LocalDate? = null

    @Column(name = "end_date")
    var endDate: LocalDate? = null

    @Column(name = "pay_amount")
    var payAmount: Int? = null

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "pay_unit", columnDefinition = "pay_unit")
    var payUnit: PayUnit? = null

    @Column(name = "terms", columnDefinition = "text")
    var terms: String? = null

    @Column(name = "document_url", length = 500)
    var documentUrl: String? = null

    @Column(name = "sent_at")
    var sentAt: Instant? = null

    @Column(name = "employer_signed_at")
    var employerSignedAt: Instant? = null

    @Column(name = "worker_signed_at")
    var workerSignedAt: Instant? = null

    @Column(name = "cancelled_at")
    var cancelledAt: Instant? = null

    @Column(name = "cancellation_reason", columnDefinition = "text")
    var cancellationReason: String? = null
}
