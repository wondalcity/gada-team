package com.gada.api.presentation.v1.auth

import com.gada.api.domain.user.UserRole
import com.gada.api.domain.user.UserStatus

data class AuthResponse(
    val userId: Long,
    val phone: String,
    val role: UserRole,
    val status: UserStatus,
    val isNewUser: Boolean,
)
