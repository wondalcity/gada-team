package com.gada.api.presentation.v1.auth

import com.gada.api.common.model.LanguageEntry
import com.gada.api.domain.user.UserRole
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class LoginRequest(
    @field:NotBlank(message = "Firebase ID token is required")
    val idToken: String,
)

data class OnboardRequest(
    @field:NotBlank(message = "idToken is required")
    val idToken: String,

    val role: UserRole,

    @field:NotBlank(message = "fullName is required")
    val fullName: String,

    @field:Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "birthDate must be YYYY-MM-DD")
    val birthDate: String? = null,

    val nationality: String = "KR",

    val profileImageUrl: String? = null,

    val visaType: String? = null,

    val languages: List<LanguageEntry>? = null,

    val desiredJobCategories: List<Long>? = null,

    val desiredPayMin: Int? = null,

    val desiredPayMax: Int? = null,

    val desiredPayUnit: String? = null,
)
