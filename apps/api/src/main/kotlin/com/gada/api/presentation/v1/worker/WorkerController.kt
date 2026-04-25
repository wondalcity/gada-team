package com.gada.api.presentation.v1.worker

import com.gada.api.common.ApiResponse
import com.gada.api.common.model.CertificationEntry
import com.gada.api.common.model.LanguageEntry
import com.gada.api.common.model.PortfolioEntry
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.infrastructure.persistence.team.TeamMemberRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import com.gada.api.domain.user.VisaType
import com.gada.api.domain.user.HealthCheckStatus
import com.gada.api.domain.user.PayUnit
import com.gada.api.domain.user.UserRole
import com.gada.api.domain.user.WorkerProfile
import com.fasterxml.jackson.annotation.JsonInclude
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/workers")
class WorkerController(
    private val workerProfileRepository: WorkerProfileRepository,
    private val userRepository: UserRepository,
    private val teamMemberRepository: TeamMemberRepository,
    private val teamRepository: TeamRepository,
) {

    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    fun listWorkers(
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) nationality: String?,
        @RequestParam(required = false) visaType: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<WorkerListResponse>> {
        val visaTypeEnum = visaType?.let { runCatching { VisaType.valueOf(it) }.getOrNull() }
        val (profiles, total) = workerProfileRepository.findAll(
            keyword = keyword,
            nationality = nationality,
            visaType = visaTypeEnum,
            page = page,
            size = size,
        )

        // Batch-fetch teams for TEAM_LEADER profiles to avoid N+1
        val leaderUserIds = profiles
            .filter { it.user?.role == UserRole.TEAM_LEADER }
            .map { it.userId }
        val teamsByLeader = leaderUserIds
            .mapNotNull { uid -> teamRepository.findByLeaderId(uid)?.let { uid to it } }
            .toMap()

        val items = profiles.map { wp ->
            val isLeader = wp.user?.role == UserRole.TEAM_LEADER
            val team = if (isLeader) teamsByLeader[wp.userId] else null
            WorkerListItem(
                publicId = wp.publicId.toString(),
                fullName = wp.fullName,
                nationality = wp.nationality,
                visaType = wp.visaType.name,
                healthCheckStatus = wp.healthCheckStatus.name,
                profileImageUrl = wp.profileImageUrl,
                desiredPayMin = wp.desiredPayMin,
                desiredPayMax = wp.desiredPayMax,
                desiredPayUnit = wp.desiredPayUnit?.name,
                isTeamLeader = isLeader,
                teamPublicId = team?.publicId?.toString(),
                teamName = team?.name,
            )
        }

        return ApiResponse.ok(
            WorkerListResponse(
                content = items,
                page = page,
                size = size,
                totalElements = total,
                totalPages = ((total + size - 1) / size).toInt(),
            )
        ).toResponseEntity()
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('WORKER', 'TEAM_LEADER')")
    fun getMyProfile(
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<WorkerProfileResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val user = userRepository.findById(userId) ?: throw UnauthorizedException()
        val profile = workerProfileRepository.findByUserId(userId)
            ?: throw NotFoundException("WorkerProfile")

        // Resolve team membership
        val membership = teamMemberRepository.findActiveByUserId(userId).firstOrNull()
        val team = membership?.let { teamRepository.findById(it.teamId) }

        val response = WorkerProfileResponse(
            publicId = profile.publicId.toString(),
            userId = userId,
            phone = user.phone,
            role = user.role.name,
            status = user.status.name,
            fullName = profile.fullName,
            birthDate = profile.birthDate.toString(),
            nationality = profile.nationality,
            visaType = profile.visaType.name,
            healthCheckStatus = profile.healthCheckStatus.name,
            profileImageUrl = profile.profileImageUrl,
            languages = profile.languages,
            certifications = profile.certifications,
            equipment = profile.equipment,
            portfolio = profile.portfolio,
            desiredPayMin = profile.desiredPayMin,
            desiredPayMax = profile.desiredPayMax,
            desiredPayUnit = profile.desiredPayUnit?.name,
            desiredJobCategories = profile.desiredJobCategories,
            teamPublicId = team?.publicId?.toString(),
            teamName = team?.name,
            createdAt = profile.createdAt.toString(),
        )

        return ApiResponse.ok(response).toResponseEntity()
    }

    @GetMapping("/{publicId}")
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    fun getWorker(
        @PathVariable publicId: String,
    ): ResponseEntity<ApiResponse<WorkerPublicProfileResponse>> {
        val uuid = runCatching { java.util.UUID.fromString(publicId) }.getOrElse {
            throw NotFoundException("WorkerProfile")
        }
        val profile = workerProfileRepository.findByPublicId(uuid)
            ?: throw NotFoundException("WorkerProfile")

        val isLeader = profile.user?.role == UserRole.TEAM_LEADER
        val team = if (isLeader) teamRepository.findByLeaderId(profile.userId) else null

        val response = WorkerPublicProfileResponse(
            publicId = profile.publicId.toString(),
            fullName = profile.fullName,
            nationality = profile.nationality,
            visaType = profile.visaType.name,
            healthCheckStatus = profile.healthCheckStatus.name,
            profileImageUrl = profile.profileImageUrl,
            languages = profile.languages,
            certifications = profile.certifications,
            equipment = profile.equipment,
            portfolio = profile.portfolio,
            desiredPayMin = profile.desiredPayMin,
            desiredPayMax = profile.desiredPayMax,
            desiredPayUnit = profile.desiredPayUnit?.name,
            desiredJobCategories = profile.desiredJobCategories,
            bio = profile.bio,
            isTeamLeader = isLeader,
            teamPublicId = team?.publicId?.toString(),
            teamName = team?.name,
        )

        return ApiResponse.ok(response).toResponseEntity()
    }

    @PatchMapping("/me")
    @Transactional
    @PreAuthorize("hasAnyRole('WORKER', 'TEAM_LEADER')")
    fun updateMyProfile(
        @CurrentUser principal: GadaPrincipal,
        @RequestBody request: WorkerProfileUpdateRequest,
    ): ResponseEntity<ApiResponse<WorkerProfileResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val profile = workerProfileRepository.findByUserId(userId)
            ?: throw NotFoundException("WorkerProfile")

        request.fullName?.let { profile.fullName = it }
        request.profileImageUrl?.let { profile.profileImageUrl = it }
        request.nationality?.let { profile.nationality = it }
        request.visaType?.let {
            profile.visaType = runCatching { VisaType.valueOf(it) }.getOrElse { VisaType.OTHER }
        }
        request.languages?.let { profile.languages = it }
        request.certifications?.let { profile.certifications = it }
        request.equipment?.let { profile.equipment = it }
        request.portfolio?.let { profile.portfolio = it }
        request.desiredPayMin?.let { profile.desiredPayMin = it }
        request.desiredPayMax?.let { profile.desiredPayMax = it }
        request.desiredPayUnit?.let {
            profile.desiredPayUnit = runCatching { PayUnit.valueOf(it) }.getOrElse { PayUnit.DAILY }
        }
        request.desiredJobCategories?.let { profile.desiredJobCategories = it }
        request.bio?.let { profile.bio = it }
        request.isPublic?.let { profile.isPublic = it }

        val saved = workerProfileRepository.save(profile)

        val user = userRepository.findById(userId) ?: throw UnauthorizedException()
        val membership = teamMemberRepository.findActiveByUserId(userId).firstOrNull()
        val team = membership?.let { teamRepository.findById(it.teamId) }

        val response = WorkerProfileResponse(
            publicId = saved.publicId.toString(),
            userId = userId,
            phone = user.phone,
            role = user.role.name,
            status = user.status.name,
            fullName = saved.fullName,
            birthDate = saved.birthDate.toString(),
            nationality = saved.nationality,
            visaType = saved.visaType.name,
            healthCheckStatus = saved.healthCheckStatus.name,
            profileImageUrl = saved.profileImageUrl,
            languages = saved.languages,
            certifications = saved.certifications,
            equipment = saved.equipment,
            portfolio = saved.portfolio,
            desiredPayMin = saved.desiredPayMin,
            desiredPayMax = saved.desiredPayMax,
            desiredPayUnit = saved.desiredPayUnit?.name,
            desiredJobCategories = saved.desiredJobCategories,
            teamPublicId = team?.publicId?.toString(),
            teamName = team?.name,
            createdAt = saved.createdAt.toString(),
        )

        return ApiResponse.ok(response).toResponseEntity()
    }
}

@JsonInclude(JsonInclude.Include.NON_NULL)
data class WorkerProfileResponse(
    val publicId: String,
    val userId: Long,
    val phone: String,
    val role: String,
    val status: String,
    val fullName: String,
    val birthDate: String,
    val nationality: String,
    val visaType: String,
    val healthCheckStatus: String,
    val profileImageUrl: String?,
    val languages: List<LanguageEntry>,
    val certifications: List<CertificationEntry>,
    val equipment: List<String>,
    val portfolio: List<PortfolioEntry>,
    val desiredPayMin: Int?,
    val desiredPayMax: Int?,
    val desiredPayUnit: String?,
    val desiredJobCategories: List<Long>,
    val teamPublicId: String?,
    val teamName: String?,
    val createdAt: String,
)

data class WorkerListItem(
    val publicId: String,
    val fullName: String,
    val nationality: String,
    val visaType: String,
    val healthCheckStatus: String,
    val profileImageUrl: String?,
    val desiredPayMin: Int?,
    val desiredPayMax: Int?,
    val desiredPayUnit: String?,
    val isTeamLeader: Boolean,
    val teamPublicId: String?,
    val teamName: String?,
)

data class WorkerListResponse(
    val content: List<WorkerListItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class WorkerPublicProfileResponse(
    val publicId: String,
    val fullName: String,
    val nationality: String,
    val visaType: String,
    val healthCheckStatus: String,
    val profileImageUrl: String?,
    val languages: List<LanguageEntry>,
    val certifications: List<CertificationEntry>,
    val equipment: List<String>,
    val portfolio: List<PortfolioEntry>,
    val desiredPayMin: Int?,
    val desiredPayMax: Int?,
    val desiredPayUnit: String?,
    val desiredJobCategories: List<Long>,
    val bio: String?,
    val isTeamLeader: Boolean,
    val teamPublicId: String?,
    val teamName: String?,
)

data class WorkerProfileUpdateRequest(
    val fullName: String? = null,
    val profileImageUrl: String? = null,
    val nationality: String? = null,
    val visaType: String? = null,
    val languages: List<LanguageEntry>? = null,
    val certifications: List<CertificationEntry>? = null,
    val equipment: List<String>? = null,
    val portfolio: List<PortfolioEntry>? = null,
    val desiredPayMin: Int? = null,
    val desiredPayMax: Int? = null,
    val desiredPayUnit: String? = null,
    val desiredJobCategories: List<Long>? = null,
    val bio: String? = null,
    val isPublic: Boolean? = null,
)
