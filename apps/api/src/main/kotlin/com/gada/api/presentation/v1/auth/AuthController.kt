package com.gada.api.presentation.v1.auth

import com.gada.api.application.auth.AuthUseCase
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@Tag(name = "Auth", description = "전화번호 인증 및 비밀번호 기반 인증")
@RestController
@RequestMapping("/api/v1/auth")
class AuthController(private val authUseCase: AuthUseCase) {

    @Operation(summary = "Firebase OTP 로그인 / 회원가입 (레거시)", description = "Firebase ID 토큰 검증 후 사용자 upsert")
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
    ): ResponseEntity<ApiResponse<AuthResponse>> {
        val result = authUseCase.login(request)
        val status = if (result.isNewUser) HttpStatus.CREATED else HttpStatus.OK
        return ApiResponse.ok(result).toResponseEntity(status)
    }

    @Operation(summary = "회원가입", description = "이름 + 전화번호 + 전화번호 인증 + 비밀번호로 신규 회원가입")
    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: RegisterRequest,
    ): ResponseEntity<ApiResponse<AuthResponse>> {
        val result = authUseCase.register(request)
        return ApiResponse.ok(result).toResponseEntity(HttpStatus.CREATED)
    }

    @Operation(summary = "비밀번호 로그인", description = "전화번호 + 비밀번호로 로그인. JWT 토큰 반환.")
    @PostMapping("/login/password")
    fun loginWithPassword(
        @Valid @RequestBody request: PasswordLoginRequest,
    ): ResponseEntity<ApiResponse<AuthResponse>> {
        val result = authUseCase.loginWithPassword(request)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "온보딩", description = "역할 선택 및 기본 정보 입력 (JWT 또는 Firebase 토큰 인증)")
    @PostMapping("/onboard")
    fun onboard(
        @Valid @RequestBody request: OnboardRequest,
        @CurrentUser principal: GadaPrincipal?,
    ): ResponseEntity<ApiResponse<AuthResponse>> {
        val result = authUseCase.onboard(request, principal)
        return ApiResponse.ok(result, "온보딩이 완료되었습니다.").toResponseEntity()
    }

    @Operation(summary = "현재 사용자 확인", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/me")
    fun me(
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any?>>> {
        val body: Map<String, Any?> = mapOf(
            "firebaseUid" to principal.firebaseUid,
            "phone" to principal.phone,
            "userId" to principal.userId,
            "role" to principal.role,
        )
        return ApiResponse.ok(body).toResponseEntity()
    }
}
