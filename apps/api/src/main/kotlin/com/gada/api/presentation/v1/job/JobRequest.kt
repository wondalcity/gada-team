package com.gada.api.presentation.v1.job

import com.gada.api.domain.job.JobStatus
import com.gada.api.domain.user.PayUnit
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.util.UUID

data class CreateJobRequest(
    @field:NotNull val sitePublicId: UUID,
    @field:NotBlank val title: String,
    val description: String? = null,
    val requiredCount: Int? = null,
    val applicationTypes: List<String>? = null,
    val payMin: Int? = null,
    val payMax: Int? = null,
    val payUnit: PayUnit? = null,
    val visaRequirements: List<String>? = null,
    val certificationRequirements: List<String>? = null,
    val healthCheckRequired: Boolean? = null,
    val alwaysOpen: Boolean? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val jobCategoryId: Long? = null,
    val accommodationProvided: Boolean? = null,
    val mealProvided: Boolean? = null,
    val transportationProvided: Boolean? = null,
)

data class UpdateJobRequest(
    val title: String? = null,
    val description: String? = null,
    val requiredCount: Int? = null,
    val applicationTypes: List<String>? = null,
    val payMin: Int? = null,
    val payMax: Int? = null,
    val payUnit: PayUnit? = null,
    val visaRequirements: List<String>? = null,
    val certificationRequirements: List<String>? = null,
    val healthCheckRequired: Boolean? = null,
    val alwaysOpen: Boolean? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val accommodationProvided: Boolean? = null,
    val mealProvided: Boolean? = null,
    val transportationProvided: Boolean? = null,
)

data class PatchJobStatusRequest(
    val status: JobStatus,
)
