package com.gada.api.domain.contract

import com.gada.api.domain.user.PayUnit
import jakarta.persistence.*
import org.hibernate.annotations.JdbcType
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "contract_templates")
class ContractTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "employer_user_id", nullable = false, unique = true)
    var employerUserId: Long = 0

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

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
}
