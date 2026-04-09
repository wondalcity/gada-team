package com.gada.api.presentation.v1.job

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class JobSummaryResponse(
    val publicId: UUID,
    val title: String,
    val companyPublicId: UUID?,
    val companyName: String,
    val companyLogoUrl: String?,
    val sitePublicId: UUID?,
    val siteName: String,
    val sido: String?,
    val sigungu: String?,
    val categoryId: Long?,
    val categoryName: String?,
    val payMin: Int?,
    val payMax: Int?,
    val payUnit: String,
    val requiredCount: Int?,
    val applicationTypes: List<String>,
    val accommodationProvided: Boolean,
    val mealProvided: Boolean,
    val transportationProvided: Boolean,
    val status: String,
    val alwaysOpen: Boolean,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val viewCount: Int,
    val applicationCount: Int,
    val publishedAt: Instant?,
    val createdAt: Instant,
    val siteLat: Double? = null,
    val siteLng: Double? = null,
    val distanceKm: Double? = null,
)

data class JobDetailResponse(
    val publicId: UUID,
    val sitePublicId: UUID?,
    val companyPublicId: UUID?,
    val companyName: String,
    val siteName: String,
    val sido: String?,
    val sigungu: String?,
    val categoryName: String?,
    val title: String,
    val description: String?,
    val payMin: Int?,
    val payMax: Int?,
    val payUnit: String,
    val applicationTypes: List<String>,
    val accommodationProvided: Boolean,
    val mealProvided: Boolean,
    val transportationProvided: Boolean,
    val requiredCount: Int?,
    val alwaysOpen: Boolean,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val status: String,
    val viewCount: Int,
    val applicationCount: Int,
    val publishedAt: Instant?,
    val createdAt: Instant,
)

data class JobListResponse(
    val content: List<JobSummaryResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class JobCategoryResponse(
    val id: Long,
    val code: String,
    val nameKo: String,
    val nameVi: String?,
    val parentId: Long?,
)
