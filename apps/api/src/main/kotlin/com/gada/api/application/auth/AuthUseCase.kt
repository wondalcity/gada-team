package com.gada.api.application.auth

import com.gada.api.application.sms.SmsService
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.domain.user.*
import com.gada.api.infrastructure.persistence.user.EmployerProfileRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import com.gada.api.presentation.v1.auth.AuthResponse
import com.gada.api.presentation.v1.auth.LoginRequest
import com.gada.api.presentation.v1.auth.OnboardRequest
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Transactional
class AuthUseCase(
    private val userRepository: UserRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val employerProfileRepository: EmployerProfileRepository,
    private val firebaseApp: FirebaseApp,
    private val smsService: SmsService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun login(request: LoginRequest): AuthResponse {
        val decoded = try {
            FirebaseAuth.getInstance(firebaseApp).verifyIdToken(request.idToken)
        } catch (e: Exception) {
            log.warn("Invalid Firebase ID token: {}", e.message)
            throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
        }

        val uid = decoded.uid
        val phone = decoded.claims["phone_number"] as? String
            ?: throw BusinessException("전화번호가 없는 Firebase 계정입니다.", "PHONE_REQUIRED", HttpStatus.BAD_REQUEST)

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

    fun onboard(request: OnboardRequest): AuthResponse {
        val decoded = try {
            FirebaseAuth.getInstance(firebaseApp).verifyIdToken(request.idToken)
        } catch (e: Exception) {
            throw UnauthorizedException("유효하지 않은 인증 토큰입니다.")
        }

        val user = userRepository.findByFirebaseUid(decoded.uid)
            ?: throw UnauthorizedException("먼저 로그인을 완료해주세요.")

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

        try {
            FirebaseAuth.getInstance(firebaseApp).setCustomUserClaims(
                decoded.uid,
                mapOf("userId" to user.id, "role" to user.role.name),
            )
        } catch (e: Exception) {
            log.warn("Failed to set Firebase custom claims for uid={}: {}", decoded.uid, e.message)
        }

        triggerOnboardingHook(user.id, user.phone, user.role)

        log.info("User onboarded: id={} role={}", user.id, user.role)

        return AuthResponse(
            userId = user.id,
            phone = user.phone,
            role = user.role,
            status = user.status,
            isNewUser = false,
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
