package com.gada.api.presentation.v1.auth

import com.gada.api.common.model.LanguageEntry
import com.gada.api.domain.user.UserRole
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class LoginRequest(
    @field:NotBlank(message = "Firebase ID token is required")
    val idToken: String,
)

/** 이름 + 전화번호 + 전화번호 인증(Firebase OTP) + 비밀번호로 신규 회원가입 */
data class RegisterRequest(
    @field:NotBlank(message = "이름을 입력해주세요")
    val name: String,

    @field:NotBlank(message = "전화번호를 입력해주세요")
    val phone: String,

    /** Firebase OTP 인증 후 발급된 ID 토큰 (dev 모드에서는 생략 가능) */
    val firebaseOtpToken: String? = null,

    @field:NotBlank(message = "비밀번호를 입력해주세요")
    @field:Size(min = 6, message = "비밀번호는 6자 이상이어야 합니다")
    val password: String,
)

/** 전화번호 + 비밀번호로 로그인 */
data class PasswordLoginRequest(
    @field:NotBlank(message = "전화번호를 입력해주세요")
    val phone: String,

    @field:NotBlank(message = "비밀번호를 입력해주세요")
    val password: String,
)

/** 이메일 + 비밀번호로 관리자 로그인 */
data class AdminLoginRequest(
    @field:NotBlank(message = "이메일을 입력해주세요")
    val email: String,

    @field:NotBlank(message = "비밀번호를 입력해주세요")
    val password: String,
)

data class OnboardRequest(
    val idToken: String? = null,

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
