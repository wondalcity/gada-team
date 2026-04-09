package com.gada.api.presentation.v1.company

import com.gada.api.domain.company.SiteStatus
import jakarta.validation.constraints.NotBlank
import java.math.BigDecimal
import java.time.LocalDate

data class CreateCompanyRequest(
    @field:NotBlank val name: String,
    val businessRegistrationNumber: String? = null,
    val ceoName: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val websiteUrl: String? = null,
    val description: String? = null,
)

data class UpdateCompanyRequest(
    val name: String? = null,
    val businessRegistrationNumber: String? = null,
    val ceoName: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val websiteUrl: String? = null,
    val description: String? = null,
    val logoUrl: String? = null,
)

data class CreateSiteRequest(
    @field:NotBlank val name: String,
    @field:NotBlank val address: String,
    val addressDetail: String? = null,
    val latitude: BigDecimal? = null,
    val longitude: BigDecimal? = null,
    val description: String? = null,
    val regionId: Long? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
)

data class UpdateSiteRequest(
    val name: String? = null,
    val address: String? = null,
    val addressDetail: String? = null,
    val description: String? = null,
    val status: SiteStatus? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
)
