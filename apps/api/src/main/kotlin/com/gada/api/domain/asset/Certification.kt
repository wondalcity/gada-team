package com.gada.api.domain.asset

import com.gada.api.common.BaseEntity
import jakarta.persistence.*
import java.time.LocalDate

@Entity
@Table(name = "certifications")
class Certification : BaseEntity() {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "worker_profile_id", nullable = false)
    var workerProfileId: Long = 0

    @Column(name = "name", length = 200, nullable = false)
    var name: String = ""

    @Column(name = "issuing_body", length = 200)
    var issuingBody: String? = null

    @Column(name = "issued_at")
    var issuedAt: LocalDate? = null

    @Column(name = "expires_at")
    var expiresAt: LocalDate? = null

    @Column(name = "certificate_number", length = 100)
    var certificateNumber: String? = null

    @Column(name = "image_url", length = 500)
    var imageUrl: String? = null

    @Column(name = "is_verified", nullable = false)
    var isVerified: Boolean = false

    @Column(name = "verification_status", length = 30, nullable = false)
    var verificationStatus: String = "UNSUBMITTED"

    @Column(name = "verified_by")
    var verifiedBy: Long? = null

    @Column(name = "rejection_reason", columnDefinition = "text")
    var rejectionReason: String? = null
}
