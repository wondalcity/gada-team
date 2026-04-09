package com.gada.api.common.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

/**
 * Lightweight data classes serialized into JSONB columns.
 * All fields have defaults so Jackson can construct them without a no-arg constructor call.
 */

@JsonIgnoreProperties(ignoreUnknown = true)
data class LanguageEntry(
    val code: String = "",          // ISO 639-1: ko, en, vi, zh, ...
    val level: String = "BASIC",    // NATIVE | FLUENT | INTERMEDIATE | BASIC
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CertificationEntry(
    val code: String = "",
    val name: String = "",
    val issueDate: String? = null,   // ISO-8601 date string
    val expiryDate: String? = null,
    val verifiedAt: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class RegionEntry(
    val sido: String = "",
    val sigungu: String = "",
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class IntroTranslation(
    val short: String = "",
    val long: String = "",
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class PortfolioEntry(
    val title: String = "",
    val description: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val imageUrls: List<String> = emptyList(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class FaqEntry(
    val question: String = "",
    val answer: String = "",
)
