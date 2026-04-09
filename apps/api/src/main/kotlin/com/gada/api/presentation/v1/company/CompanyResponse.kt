package com.gada.api.presentation.v1.company

import com.gada.api.domain.company.CompanyStatus
import com.gada.api.domain.company.SiteStatus
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class CompanyResponse(
    val publicId: UUID,
    val name: String,
    val businessRegistrationNumber: String?,
    val ceoName: String?,
    val address: String?,
    val phone: String?,
    val email: String?,
    val websiteUrl: String?,
    val description: String?,
    val logoUrl: String?,
    val status: CompanyStatus,
    val isVerified: Boolean,
    val siteCount: Int,
    val activeJobCount: Int,
    val createdAt: Instant,
)

data class SiteResponse(
    val publicId: UUID,
    val companyPublicId: UUID?,
    val companyName: String,
    val name: String,
    val address: String,
    val addressDetail: String?,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
    val description: String?,
    val status: SiteStatus,
    val sido: String?,
    val sigungu: String?,
    val activeJobCount: Int,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val createdAt: Instant,
)
