package com.gada.api.application.auth

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.gada.api.application.sms.SmsService
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.config.GadaPrincipal
import com.gada.api.config.JwtService
import com.gada.api.domain.user.*
import com.gada.api.infrastructure.persistence.user.EmployerProfileRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import com.gada.api.presentation.v1.auth.AuthResponse
import com.gada.api.presentation.v1.auth.LoginRequest
import com.gada.api.presentation.v1.auth.OnboardRequest
import com.gada.api.presentation.v1.auth.PasswordLoginRequest
import com.gada.api.presentation.v1.auth.RegisterRequest
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.Base64

@Service
@Transactional
class AuthUseCase(
    private val userRepository: UserRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val employerProfileRepository: EmployerProfileRepository,
    private val firebaseApp: FirebaseApp,
    private val smsService: SmsService,
    private val jwtService: JwtService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Value("\${dev.auth.bypass:false}")
    private var devAuthBypass: Boolean = false

    private val jsonMapper = jacksonObjectMapper()
    private val passwordEncoder = BCryptPasswordEncoder()

    /**
     * In local dev (dev.auth.bypass=true), Firebase Admin has no credentials so
     * verifyIdToken() always fails. Instead, decode the JWT payload directly
     * without signature verification — safe for local-only use.
     */
    private data class JwtClaims(
        val sub: String = "",
        val phone_number: String? = null,
        val uid: String? = null,
    )

    private fun decodeJwtPayload(idToken: String): Map<String, Any?> {
        val parts = idToken.split(".")
        if (parts.size < 2) throw UnauthorizedException("Invalid JWT format")
        val payload = Base64.getUrlDecoder().decode(parts[1].padEnd((parts[1].length + 3) / 4 * 4, '='))
        return jsonMapper.readValue(payload)
    }

    fun login(request: LoginRequest): AuthResponse {
        val uid: String
        val phone: String

        if (devAuthBypass) {
            // Local dev: skip signature verification, parse payload directly
            log.debug("[DEV] Decoding Firebase JWT without signature verification")
            val claims = try { decodeJwtPayload(request.idToken) } catch (e: Exception) {
                throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
            }
            uid = (claims["sub"] as? String)?.takeIf { it.isNotBlank() }
                ?: throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
            phone = (claims["phone_number"] as? String)
                ?: throw BusinessException("전화번호가 없는 Firebase 계정입니다.", "PHONE_REQUIRED", HttpStatus.BAD_REQUEST)
        } else {
            val decoded = try {
                FirebaseAuth.getInstance(firebaseApp).verifyIdToken(request.idToken)
            } catch (e: Exception) {
                log.warn("Invalid Firebase ID token: {}", e.message)
                throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
            }
            uid = decoded.uid
            phone = decoded.claims["phone_number"] as? String
                ?: throw BusinessException("전화번호가 없는 Firebase 계정입니다.", "PHONE_REQUIRED", HttpStatus.BAD_REQUEST)
        }

        val existing = userRepository.findByFirebaseUid(uid)
        if (existing != null) {
            return AuthResponse(
                userId = existing.id,
                phone = existing.phone,
                role = existing.role,
                status = existing.status,
                isNewUser = false,
            )
        }

        val user = User().apply {
            this.phone = phone
            this.firebaseUid = uid
            this.role = UserRole.WORKER
            this.status = UserStatus.PENDING
        }
        userRepository.save(user)
        log.info("New user created: uid={} phone={}", uid, phone)

        return AuthResponse(
            userId = user.id,
            phone = user.phone,
            role = user.role,
            status = user.status,
            isNewUser = true,
        )
    }

    /**
     * 이름 + 전화번호 + 전화번호 인증(Firebase OTP) + 비밀번호로 회원가입.
     * 성공 시 JWT 토큰을 포함한 AuthResponse 반환.
     */
    fun register(request: RegisterRequest): AuthResponse {
        // 1. Verify Firebase OTP token to confirm phone ownership (skip in dev)
        if (!devAuthBypass && request.firebaseOtpToken != null) {
            try {
                val decoded = FirebaseAuth.getInstance(firebaseApp).verifyIdToken(request.firebaseOtpToken)
                val tokenPhone = decoded.claims["phone_number"] as? String
                // Loosely compare: normalise both to digits only
                if (tokenPhone != null) {
                    val digits = { s: String -> s.replace(Regex("\\D"), "") }
                    if (!digits(tokenPhone).endsWith(digits(request.phone)) &&
                        !digits(request.phone).endsWith(digits(tokenPhone))) {
                        throw BusinessException("전화번호 인증 토큰이 일치하지 않습니다.", "PHONE_MISMATCH", HttpStatus.BAD_REQUEST)
                    }
                }
            } catch (e: BusinessException) {
                throw e
            } catch (e: Exception) {
                log.warn("Firebase OTP token verification failed: {}", e.message)
                throw UnauthorizedException("전화번호 인증에 실패했습니다.")
            }
        }

        // 2. Check phone uniqueness
        if (userRepository.findByPhone(request.phone) != null) {
            throw ConflictException("이미 가입된 전화번호입니다.", "PHONE_DUPLICATE")
        }

        // 3. Create user
        val user = User().apply {
            phone = request.phone
            fullName = request.name
            passwordHash = passwordEncoder.encode(request.password)
            role = UserRole.WORKER
            status = UserStatus.PENDING
        }
        userRepository.save(user)
        log.info("New user registered: phone={}", request.phone)

        val token = jwtService.generateToken(user.id, user.phone, user.role.name)
        return AuthResponse(
            userId = user.id,
            phone = user.phone,
            role = user.role,
            status = user.status,
            isNewUser = true,
            token = token,
        )
    }

    /**
     * 전화번호 + 비밀번호로 로그인. 성공 시 JWT 토큰 반환.
     */
    fun loginWithPassword(request: PasswordLoginRequest): AuthResponse {
        val user = userRepository.findByPhone(request.phone)
            ?: throw UnauthorizedException("전화번호 또는 비밀번호가 올바르지 않습니다.")

        val hash = user.passwordHash
            ?: throw UnauthorizedException("비밀번호가 설정되지 않은 계정입니다. 전화번호 인증으로 로그인해주세요.")

        if (!passwordEncoder.matches(request.password, hash)) {
            throw UnauthorizedException("전화번호 또는 비밀번호가 올바르지 않습니다.")
        }

        if (user.status == UserStatus.SUSPENDED) {
            throw BusinessException("정지된 계정입니다.", "ACCOUNT_SUSPENDED", HttpStatus.FORBIDDEN)
        }

        val token = jwtService.generateToken(user.id, user.phone, user.role.name)
        return AuthResponse(
            userId = user.id,
            phone = user.phone,
            role = user.role,
            status = user.status,
            isNewUser = false,
            token = token,
        )
    }

    fun onboard(request: OnboardRequest, principal: GadaPrincipal? = null): AuthResponse {
        // Resolve the user: either from JWT principal (password auth) or Firebase OTP token
        val user = if (principal?.userId != null) {
            userRepository.findById(principal.userId)
                ?: throw UnauthorizedException("사용자를 찾을 수 없습니다.")
        } else {
            val firebaseUid = if (devAuthBypass) {
                val claims = try { decodeJwtPayload(request.idToken) } catch (e: Exception) {
                    throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
                }
                (claims["sub"] as? String)?.takeIf { it.isNotBlank() }
                    ?: throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
            } else {
                try {
                    FirebaseAuth.getInstance(firebaseApp).verifyIdToken(request.idToken).uid
                } catch (e: Exception) {
                    throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
                }
            }
            userRepository.findByFirebaseUid(firebaseUid)
                ?: throw UnauthorizedException("먼저 로그인을 완료해주세요.")
        }

        if (user.status != UserStatus.PENDING) {
            throw ConflictException("이미 온보딩이 완료된 계정입니다.", "ALREADY_ONBOARDED")
        }

        user.role = request.role
        user.activate()

        when (request.role) {
            UserRole.WORKER, UserRole.TEAM_LEADER -> {
                val birthDate = request.birthDate
                    ?: throw BusinessException("생년월일을 입력해주세요.", "BIRTH_DATE_REQUIRED", HttpStatus.BAD_REQUEST)

                val profile = WorkerProfile().apply {
                    userId = user.id
                    fullName = request.fullName
                    this.birthDate = LocalDate.parse(birthDate)
                    nationality = request.nationality
                    request.profileImageUrl?.let { profileImageUrl = it }
                    request.visaType?.let { vt -> runCatching { VisaType.valueOf(vt) }.getOrNull()?.let { visaType = it } }
                    request.languages?.let { languages = it }
                    request.desiredJobCategories?.let { desiredJobCategories = it }
                    request.desiredPayMin?.let { desiredPayMin = it }
                    request.desiredPayMax?.let { desiredPayMax = it }
                    request.desiredPayUnit?.let { pu -> runCatching { PayUnit.valueOf(pu) }.getOrNull()?.let { desiredPayUnit = it } }
                }
                workerProfileRepository.save(profile)
            }
            UserRole.EMPLOYER -> {
                val profile = EmployerProfile().apply {
                    userId = user.id
                    fullName = request.fullName
                }
                employerProfileRepository.save(profile)
            }
            UserRole.ADMIN -> {
                throw ForbiddenException("관리자 계정은 직접 신청할 수 없습니다.")
            }
        }

        // Set Firebase custom claims if user authenticated via Firebase (not password JWT)
        if (!devAuthBypass && principal?.userId == null && user.firebaseUid != null) {
            try {
                FirebaseAuth.getInstance(firebaseApp).setCustomUserClaims(
                    user.firebaseUid!!,
                    mapOf("userId" to user.id, "role" to user.role.name),
                )
            } catch (e: Exception) {
                log.warn("Failed to set Firebase custom claims for uid={}: {}", user.firebaseUid, e.message)
            }
        }

        // For password-based users, issue a fresh token with updated role
        val token = if (user.passwordHash != null) {
            jwtService.generateToken(user.id, user.phone, user.role.name)
        } else null

        triggerOnboardingHook(user.id, user.phone, user.role)

        log.info("User onboarded: id={} role={}", user.id, user.role)

        return AuthResponse(
            userId = user.id,
            phone = user.phone,
            role = user.role,
            status = user.status,
            isNewUser = false,
            token = token,
        )
    }

    private fun triggerOnboardingHook(userId: Long, phone: String, role: UserRole) {
        // Load worker profile name if available, fallback to phone
        val name = runCatching {
            workerProfileRepository.findByUserId(userId)?.fullName ?: phone
        }.getOrDefault(phone)

        val locale = "ko"  // TODO: derive from user preference
        smsService.sendTemplated(
            toPhone = phone,
            templateCode = "ONBOARDING_COMPLETE",
            locale = locale,
            variables = mapOf("name" to name),
            triggerEvent = "ONBOARD",
            adminUserId = null,
            userId = userId,
            scheduledAt = null,
        )
        log.info("[ONBOARD_HOOK] Queued welcome SMS: userId={} phone={} role={}", userId, phone, role)
    }
}
