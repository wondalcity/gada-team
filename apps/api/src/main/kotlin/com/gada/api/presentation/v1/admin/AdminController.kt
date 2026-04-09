package com.gada.api.presentation.v1.admin

import com.gada.api.application.application.ApplicationDetailResponse
import com.gada.api.application.application.ApplicationListResponse
import com.gada.api.application.application.ApplicationUseCase
import com.gada.api.domain.application.ApplicationStatus
import com.gada.api.infrastructure.persistence.application.ApplicationRepository
import com.gada.api.application.audit.AuditService
import com.gada.api.application.job.JobUseCase
import com.gada.api.common.AdminPermission
import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.BusinessException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.company.CompanyStatus
import com.gada.api.domain.contract.ContractStatus
import com.gada.api.domain.job.JobStatus
import com.gada.api.domain.notification.NotificationType
import com.gada.api.domain.notification.Notification
import com.gada.api.domain.notification.SmsTemplate
import com.gada.api.domain.user.AdminRole
import com.gada.api.domain.user.UserRole
import com.gada.api.domain.user.UserStatus
import com.gada.api.infrastructure.persistence.company.CompanyRepository
import com.gada.api.infrastructure.persistence.company.SiteRepository
import com.gada.api.infrastructure.persistence.contract.ContractRepository
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.notification.NotificationRepository
import com.gada.api.infrastructure.persistence.sms.SmsTemplateRepository
import com.gada.api.infrastructure.persistence.team.TeamMemberRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import com.gada.api.infrastructure.persistence.user.EmployerProfileRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import com.gada.api.presentation.v1.job.JobListResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import com.gada.api.domain.company.Company
import com.gada.api.domain.company.Site
import com.gada.api.domain.company.SiteStatus
import com.gada.api.domain.contract.Contract
import com.gada.api.domain.job.Job
import com.gada.api.domain.user.PayUnit
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.math.ceil

@Tag(name = "Admin", description = "Internal admin endpoints")
@RestController
@Transactional
@RequestMapping("/api/v1/admin")
class AdminController(
    private val companyRepository: CompanyRepository,
    private val siteRepository: SiteRepository,
    private val jobRepository: JobRepository,
    private val jobUseCase: JobUseCase,
    private val userRepository: UserRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val employerProfileRepository: EmployerProfileRepository,
    private val teamRepository: TeamRepository,
    private val teamMemberRepository: TeamMemberRepository,
    private val applicationUseCase: ApplicationUseCase,
    private val applicationRepository: ApplicationRepository,
    private val contractRepository: ContractRepository,
    private val notificationRepository: NotificationRepository,
    private val smsTemplateRepository: SmsTemplateRepository,
    private val auditService: AuditService,
    private val adminPermission: AdminPermission,
) {

    // ═══════════════════════════════════════════════════════
    // COMPANIES
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "전체 회사 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/companies")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminCompanies(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) status: String?,
    ): ResponseEntity<ApiResponse<AdminCompanyListResponse>> {
        val statusFilter = status?.let { runCatching { CompanyStatus.valueOf(it) }.getOrNull() }
        val (companies, total) = companyRepository.findAll(page, size, keyword, statusFilter)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = companies.map { company ->
            val sites = siteRepository.findByCompanyId(company.id)
            val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
            val activeJobCount = jobs.count { it.status == JobStatus.PUBLISHED }
            AdminCompanyItem(
                publicId = company.publicId,
                name = company.name,
                businessRegistrationNumber = company.businessRegistrationNumber,
                status = company.status,
                isVerified = company.isVerified,
                siteCount = sites.size,
                activeJobCount = activeJobCount,
                createdAt = company.createdAt,
            )
        }

        val response = AdminCompanyListResponse(
            content = content,
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    @Operation(summary = "회사 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/companies/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminCompanyDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<AdminCompanyDetailResponse>> {
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)

        val sites = siteRepository.findByCompanyId(company.id)
        val (allJobs, _) = jobRepository.findByCompanyId(company.id, 0, 5)
        val (allJobsFull, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)

        val siteItems = sites.map { site ->
            val activeCount = allJobsFull.count {
                it.siteId == site.id && it.status == JobStatus.PUBLISHED
            }
            AdminSiteItem(
                publicId = site.publicId,
                name = site.name,
                address = site.address,
                sido = site.sido,
                sigungu = site.sigungu,
                status = site.status.name,
                activeJobCount = activeCount,
                createdAt = site.createdAt,
            )
        }

        val recentJobItems = allJobs.take(5).map { job ->
            val jobSite = sites.find { it.id == job.siteId }
            AdminJobItem(
                publicId = job.publicId,
                title = job.title,
                companyName = company.name,
                companyPublicId = company.publicId,
                siteName = jobSite?.name ?: "",
                sitePublicId = jobSite?.publicId ?: UUID.randomUUID(),
                sido = job.site?.sido,
                sigungu = job.site?.sigungu,
                categoryName = job.jobCategory?.nameKo,
                payMin = job.payMin,
                payMax = job.payMax,
                payUnit = job.payUnit.name,
                accommodationProvided = job.accommodationProvided,
                mealProvided = job.mealProvided,
                transportationProvided = job.transportationProvided,
                status = job.status.name,
                applicationCount = job.applicationCount,
                viewCount = job.viewCount,
                createdAt = job.createdAt,
            )
        }

        val response = AdminCompanyDetailResponse(
            publicId = company.publicId,
            name = company.name,
            businessRegistrationNumber = company.businessRegistrationNumber,
            ceoName = company.ceoName,
            address = company.address,
            phone = company.phone,
            email = company.email,
            websiteUrl = company.websiteUrl,
            description = company.description,
            logoUrl = company.logoUrl,
            status = company.status.name,
            isVerified = company.isVerified,
            adminNote = company.adminNote,
            rejectionReason = company.rejectionReason,
            verifiedAt = company.verifiedAt,
            createdAt = company.createdAt,
            sites = siteItems,
            recentJobs = recentJobItems,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    @Operation(summary = "회사 상태 변경 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/companies/{publicId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    fun patchCompanyStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: PatchCompanyStatusRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)

        val before = company.status.name
        when (req.status) {
            "ACTIVE" -> {
                company.verify()
                req.adminNote?.let { company.adminNote = it }
            }
            "SUSPENDED" -> {
                company.suspend()
                req.adminNote?.let { company.adminNote = it }
            }
            "CLOSED" -> {
                company.status = CompanyStatus.CLOSED
                req.adminNote?.let { company.adminNote = it }
            }
            else -> throw BusinessException("Invalid status: ${req.status}", "INVALID_STATUS")
        }
        companyRepository.save(company)

        auditService.record(
            entityType = "Company",
            entityId = company.id,
            action = "STATUS_CHANGED",
            actorId = actorId,
            actorRole = "ADMIN",
            oldData = mapOf("status" to before),
            newData = mapOf("status" to company.status.name),
        )

        return ApiResponse.ok(mapOf<String, Any>(
            "publicId" to company.publicId,
            "status" to company.status.name,
            "isVerified" to company.isVerified,
        ), "회사 상태가 변경되었습니다.").toResponseEntity()
    }

    @Operation(summary = "회사 인증 처리 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/companies/{publicId}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    fun verifyCompany(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)
        company.verify()
        companyRepository.save(company)
        auditService.record("Company", company.id, "VERIFIED", actorId, "ADMIN")
        val sites = siteRepository.findByCompanyId(company.id)
        val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.status == JobStatus.PUBLISHED }
        return ApiResponse.ok(mapOf<String, Any>(
            "publicId" to company.publicId,
            "name" to company.name,
            "status" to company.status.name,
            "isVerified" to company.isVerified,
            "siteCount" to sites.size,
            "activeJobCount" to activeJobCount,
            "createdAt" to company.createdAt,
        ), "회사가 인증되었습니다.").toResponseEntity()
    }

    @Operation(summary = "회사 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/companies/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteCompany(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)
        company.softDelete()
        companyRepository.save(company)
        auditService.record("Company", company.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "회사 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/companies/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreCompany(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        // findByPublicId filters deletedAt.isNull — use JPQL to find including deleted
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)
        company.restore()
        companyRepository.save(company)
        auditService.record("Company", company.id, "RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "회사 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/companies")
    @PreAuthorize("hasRole('ADMIN')")
    fun createCompany(
        @RequestBody req: AdminUpsertCompanyRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val company = Company().apply {
            name = req.name
            businessRegistrationNumber = req.businessRegistrationNumber
            ceoName = req.ceoName
            address = req.address
            phone = req.phone
            email = req.email
            websiteUrl = req.websiteUrl
            description = req.description
            status = req.status?.let { runCatching { CompanyStatus.valueOf(it) }.getOrNull() } ?: CompanyStatus.ACTIVE
        }
        val saved = companyRepository.save(company)
        auditService.record("Company", saved.id, "CREATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to saved.publicId.toString()), "회사가 등록되었습니다.").toResponseEntity()
    }

    @Operation(summary = "회사 수정 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/companies/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateCompany(
        @PathVariable publicId: UUID,
        @RequestBody req: AdminUpsertCompanyRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)
        req.name.takeIf { it.isNotBlank() }?.let { company.name = it }
        company.businessRegistrationNumber = req.businessRegistrationNumber ?: company.businessRegistrationNumber
        company.ceoName = req.ceoName ?: company.ceoName
        company.address = req.address ?: company.address
        company.phone = req.phone ?: company.phone
        company.email = req.email ?: company.email
        company.websiteUrl = req.websiteUrl ?: company.websiteUrl
        company.description = req.description ?: company.description
        req.status?.let { s -> runCatching { CompanyStatus.valueOf(s) }.getOrNull()?.let { company.status = it } }
        companyRepository.save(company)
        auditService.record("Company", company.id, "UPDATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to company.publicId.toString()), "회사 정보가 수정되었습니다.").toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // SITES
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "전체 현장 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/sites")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminSites(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<AdminSiteListResponse>> {
        val allSites = siteRepository.findAll(page, size)
        val totalPages = if (allSites.second == 0L) 0 else
            ceil(allSites.second.toDouble() / size).toInt()
        val items = allSites.first.map { site ->
            AdminSiteItem(
                publicId = site.publicId,
                name = site.name,
                address = site.address,
                sido = site.sido,
                sigungu = site.sigungu,
                status = site.status.name,
                activeJobCount = 0,
                createdAt = site.createdAt,
            )
        }
        return ApiResponse.ok(AdminSiteListResponse(
            content = items, page = page, size = size,
            totalElements = allSites.second, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "현장 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/sites/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminSiteDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<AdminSiteItem>> {
        val site = siteRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Site", publicId)
        val (jobs, _) = jobRepository.findByCompanyId(site.companyId, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.siteId == site.id && it.status == JobStatus.PUBLISHED }
        return ApiResponse.ok(AdminSiteItem(
            publicId = site.publicId,
            name = site.name,
            address = site.address,
            sido = site.sido,
            sigungu = site.sigungu,
            status = site.status.name,
            activeJobCount = activeJobCount,
            createdAt = site.createdAt,
        )).toResponseEntity()
    }

    @Operation(summary = "현장 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/sites/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteSite(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val site = siteRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Site", publicId)
        site.softDelete()
        siteRepository.save(site)
        auditService.record("Site", site.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "현장 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/sites/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreSite(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val site = siteRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Site", publicId)
        site.restore()
        siteRepository.save(site)
        auditService.record("Site", site.id, "RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "현장 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/sites")
    @PreAuthorize("hasRole('ADMIN')")
    fun createSite(
        @RequestBody req: AdminUpsertSiteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val company = companyRepository.findByPublicId(req.companyPublicId)
            ?: throw NotFoundException("Company", req.companyPublicId)
        val site = Site().apply {
            companyId = company.id
            name = req.name
            address = req.address
            addressDetail = req.addressDetail
            description = req.description
            startDate = req.startDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            endDate = req.endDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            status = req.status?.let { runCatching { SiteStatus.valueOf(it) }.getOrNull() } ?: SiteStatus.ACTIVE
        }
        val saved = siteRepository.save(site)
        auditService.record("Site", saved.id, "CREATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to saved.publicId.toString()), "현장이 등록되었습니다.").toResponseEntity()
    }

    @Operation(summary = "현장 수정 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/sites/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateSite(
        @PathVariable publicId: UUID,
        @RequestBody req: AdminUpsertSiteRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val site = siteRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Site", publicId)
        req.name.takeIf { it.isNotBlank() }?.let { site.name = it }
        req.address.takeIf { it.isNotBlank() }?.let { site.address = it }
        site.addressDetail = req.addressDetail ?: site.addressDetail
        site.description = req.description ?: site.description
        req.startDate?.let { site.startDate = runCatching { LocalDate.parse(it) }.getOrNull() }
        req.endDate?.let { site.endDate = runCatching { LocalDate.parse(it) }.getOrNull() }
        req.status?.let { s -> runCatching { SiteStatus.valueOf(s) }.getOrNull()?.let { site.status = it } }
        siteRepository.save(site)
        auditService.record("Site", site.id, "UPDATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to site.publicId.toString()), "현장 정보가 수정되었습니다.").toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // JOBS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "전체 공고 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/jobs")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminJobs(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) categoryId: Long?,
    ): ResponseEntity<ApiResponse<JobListResponse>> {
        val result = jobUseCase.getAdminJobs(page, size, keyword, status, categoryId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "공고 상태 변경 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/jobs/{publicId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    fun patchJobStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: Map<String, String>,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val job = jobRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Job", publicId)
        when (req["status"]) {
            "PUBLISHED" -> job.publish()
            "PAUSED" -> job.pause()
            "CLOSED" -> job.close()
            else -> throw BusinessException("지원하지 않는 상태입니다.", "INVALID_STATUS")
        }
        jobRepository.save(job)
        auditService.record("Job", job.id, "STATUS_CHANGED:${req["status"]}", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "공고 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/jobs/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteJob(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val job = jobRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Job", publicId)
        job.softDelete()
        jobRepository.save(job)
        auditService.record("Job", job.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "공고 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/jobs/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreJob(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val job = jobRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Job", publicId)
        job.restore()
        jobRepository.save(job)
        auditService.record("Job", job.id, "RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "공고 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/jobs")
    @PreAuthorize("hasRole('ADMIN')")
    fun createJob(
        @RequestBody req: AdminUpsertJobRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val site = siteRepository.findByPublicId(req.sitePublicId)
            ?: throw NotFoundException("Site", req.sitePublicId)
        val job = Job().apply {
            siteId = site.id
            companyId = site.companyId
            title = req.title
            description = req.description
            requiredCount = req.requiredCount
            applicationTypes = req.applicationTypes ?: listOf("INDIVIDUAL", "TEAM", "COMPANY")
            payMin = req.payMin
            payMax = req.payMax
            payUnit = req.payUnit?.let { runCatching { PayUnit.valueOf(it) }.getOrNull() } ?: PayUnit.DAILY
            visaRequirements = req.visaRequirements ?: emptyList()
            certificationRequirements = req.certificationRequirements ?: emptyList()
            healthCheckRequired = req.healthCheckRequired ?: false
            alwaysOpen = req.alwaysOpen ?: false
            startDate = req.startDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            endDate = req.endDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            accommodationProvided = req.accommodationProvided ?: false
            mealProvided = req.mealProvided ?: false
            transportationProvided = req.transportationProvided ?: false
            status = if (req.publish == true) JobStatus.PUBLISHED else JobStatus.DRAFT
        }
        val saved = jobRepository.save(job)
        auditService.record("Job", saved.id, "CREATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to saved.publicId.toString()), "공고가 등록되었습니다.").toResponseEntity()
    }

    @Operation(summary = "공고 수정 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/jobs/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateJob(
        @PathVariable publicId: UUID,
        @RequestBody req: AdminUpsertJobRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val job = jobRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Job", publicId)
        req.title.takeIf { it.isNotBlank() }?.let { job.title = it }
        job.description = req.description ?: job.description
        req.requiredCount?.let { job.requiredCount = it }
        req.applicationTypes?.let { job.applicationTypes = it }
        req.payMin?.let { job.payMin = it }
        req.payMax?.let { job.payMax = it }
        req.payUnit?.let { s -> runCatching { PayUnit.valueOf(s) }.getOrNull()?.let { job.payUnit = it } }
        req.visaRequirements?.let { job.visaRequirements = it }
        req.certificationRequirements?.let { job.certificationRequirements = it }
        req.healthCheckRequired?.let { job.healthCheckRequired = it }
        req.alwaysOpen?.let { job.alwaysOpen = it }
        req.startDate?.let { job.startDate = runCatching { LocalDate.parse(it) }.getOrNull() }
        req.endDate?.let { job.endDate = runCatching { LocalDate.parse(it) }.getOrNull() }
        req.accommodationProvided?.let { job.accommodationProvided = it }
        req.mealProvided?.let { job.mealProvided = it }
        req.transportationProvided?.let { job.transportationProvided = it }
        if (req.publish == true && job.status == JobStatus.DRAFT) job.publish()
        jobRepository.save(job)
        auditService.record("Job", job.id, "UPDATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to job.publicId.toString()), "공고가 수정되었습니다.").toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // WORKERS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "근로자 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/workers")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminWorkers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: String?,
    ): ResponseEntity<ApiResponse<AdminWorkerListResponse>> {
        val statusFilter = status?.let { runCatching { UserStatus.valueOf(it) }.getOrNull() }
        val (users, total) = userRepository.findWorkers(page, size, statusFilter)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = users.map { user ->
            val profile = try {
                workerProfileRepository.findByUserId(user.id)
            } catch (e: Exception) { null }
            AdminWorkerItem(
                userId = user.id,
                publicId = user.publicId,
                phone = user.phone,
                role = user.role.name,
                status = user.status.name,
                fullName = profile?.fullName,
                nationality = profile?.nationality,
                visaType = profile?.visaType?.name,
                createdAt = user.createdAt,
            )
        }

        return ApiResponse.ok(AdminWorkerListResponse(
            content = content,
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "근로자 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/workers/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminWorkerDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<AdminWorkerDetail>> {
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Worker", publicId)
        val profile = workerProfileRepository.findByUserId(user.id)

        val detail = AdminWorkerDetail(
            publicId = user.publicId,
            phone = user.phone,
            status = user.status,
            role = user.role,
            fullName = profile?.fullName ?: "",
            birthDate = profile?.birthDate?.toString(),
            nationality = profile?.nationality ?: "",
            visaType = profile?.visaType?.name ?: "",
            healthCheckStatus = profile?.healthCheckStatus?.name ?: "",
            languages = profile?.languages?.map { mapOf("code" to it.code, "level" to it.level) } ?: emptyList(),
            certifications = profile?.certifications?.map { mapOf("code" to it.code, "name" to it.name, "issueDate" to (it.issueDate ?: "")) } ?: emptyList(),
            desiredPayMin = profile?.desiredPayMin,
            desiredPayMax = profile?.desiredPayMax,
            desiredPayUnit = profile?.desiredPayUnit?.name,
            profileImageUrl = profile?.profileImageUrl,
            createdAt = user.createdAt,
            deletedAt = user.deletedAt,
            adminNote = null,
        )
        return ApiResponse.ok(detail).toResponseEntity()
    }

    @Operation(summary = "근로자 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/workers/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteWorker(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Worker", publicId)
        user.softDelete()
        userRepository.saveAndFlush(user)
        auditService.record("User", user.id, "WORKER_SOFT_DELETED", actorId, "ADMIN",
            oldData = mapOf("status" to user.status.name))
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "근로자 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/workers/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreWorker(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Worker", publicId)
        user.restore()
        userRepository.saveAndFlush(user)
        auditService.record("User", user.id, "WORKER_RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // EMPLOYERS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "고용주 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/employers")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminEmployers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: String?,
    ): ResponseEntity<ApiResponse<AdminEmployerListResponse>> {
        val statusFilter = status?.let { runCatching { UserStatus.valueOf(it) }.getOrNull() }
        val (profiles, total) = employerProfileRepository.findAll(page, size, statusFilter)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = profiles.map { ep ->
            val user = userRepository.findById(ep.userId)
            val companyName = ep.companyId?.let { companyRepository.findById(it)?.name }
            AdminEmployerItem(
                publicId = user?.publicId ?: UUID.randomUUID(),
                phone = user?.phone ?: "",
                status = user?.status ?: UserStatus.INACTIVE,
                companyName = companyName,
                fullName = ep.fullName,
                createdAt = user?.createdAt ?: ep.createdAt,
                deletedAt = user?.deletedAt,
            )
        }

        return ApiResponse.ok(AdminEmployerListResponse(
            content = content, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "고용주 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/employers/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminEmployerDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<AdminEmployerDetail>> {
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Employer", publicId)
        val ep = employerProfileRepository.findByUserId(user.id)

        return ApiResponse.ok(AdminEmployerDetail(
            publicId = user.publicId,
            phone = user.phone,
            status = user.status,
            fullName = ep?.fullName,
            email = null,
            createdAt = user.createdAt,
            deletedAt = user.deletedAt,
            adminNote = null,
        )).toResponseEntity()
    }

    @Operation(summary = "고용주 상태 변경 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/employers/{publicId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    fun patchEmployerStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: PatchUserStatusRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Employer", publicId)

        val before = user.status.name
        when (req.status) {
            "ACTIVE" -> user.activate()
            "SUSPENDED" -> user.suspend()
            "INACTIVE" -> user.deactivate()
            else -> throw BusinessException("Invalid status: ${req.status}", "INVALID_STATUS")
        }
        userRepository.saveAndFlush(user)

        auditService.record("User", user.id, "EMPLOYER_STATUS_CHANGED", actorId, "ADMIN",
            oldData = mapOf("status" to before),
            newData = mapOf("status" to user.status.name))

        return ApiResponse.ok(mapOf<String, Any>(
            "publicId" to user.publicId,
            "status" to user.status.name,
        ), "고용주 상태가 변경되었습니다.").toResponseEntity()
    }

    @Operation(summary = "고용주 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/employers/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteEmployer(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Employer", publicId)
        user.softDelete()
        userRepository.saveAndFlush(user)
        auditService.record("User", user.id, "EMPLOYER_SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "고용주 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/employers/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreEmployer(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Employer", publicId)
        user.restore()
        userRepository.saveAndFlush(user)
        auditService.record("User", user.id, "EMPLOYER_RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // TEAMS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "전체 팀 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/teams")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminTeams(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<AdminTeamListResponse>> {
        val (teams, total) = teamRepository.findAll(page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val content = teams.map { team ->
            AdminTeamItem(
                publicId = team.publicId,
                name = team.name,
                teamType = team.teamType.name,
                leaderId = team.leaderId,
                companyId = team.companyId,
                memberCount = team.memberCount,
                status = team.status.name,
                isNationwide = team.isNationwide,
                createdAt = team.createdAt,
            )
        }
        return ApiResponse.ok(AdminTeamListResponse(
            content = content, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "팀 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/teams/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminTeamDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<AdminTeamItem>> {
        val team = teamRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Team", publicId)
        return ApiResponse.ok(AdminTeamItem(
            publicId = team.publicId,
            name = team.name,
            teamType = team.teamType.name,
            leaderId = team.leaderId,
            companyId = team.companyId,
            memberCount = team.memberCount,
            status = team.status.name,
            isNationwide = team.isNationwide,
            createdAt = team.createdAt,
        )).toResponseEntity()
    }

    @Operation(summary = "팀 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/teams/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteTeam(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val team = teamRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Team", publicId)
        team.softDelete()
        teamRepository.save(team)
        auditService.record("Team", team.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "팀 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/teams/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreTeam(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val team = teamRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Team", publicId)
        team.restore()
        teamRepository.save(team)
        auditService.record("Team", team.id, "RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // APPLICATIONS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "전체 지원서 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/applications")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminApplications(
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) applicationType: String?,
        @RequestParam(required = false) jobPublicId: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<ApplicationListResponse>> {
        val result = applicationUseCase.getAdminApplications(status, applicationType, jobPublicId, page, size)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원서 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/applications/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminApplicationDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val result = applicationUseCase.getAdminApplicationDetail(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원서 검증 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/applications/{publicId}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    fun verifyApplication(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        val result = applicationUseCase.verifyApplication(userId, publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원서 상태 변경 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/applications/{publicId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateApplicationStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: UpdateApplicationStatusRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)
        val status = runCatching { ApplicationStatus.valueOf(req.status) }.getOrElse {
            throw BusinessException("잘못된 상태 값입니다: ${req.status}", "INVALID_STATUS")
        }
        app.transitionTo(status, reviewerUserId = actorId, note = req.note)
        val saved = applicationRepository.save(app)
        auditService.record("APPLICATION", saved.id, "STATUS_CHANGED", actorId, "ADMIN",
            newData = mapOf("status" to req.status))
        val job = saved.job
        val result = applicationUseCase.getAdminApplicationDetail(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    @Operation(summary = "지원자 스카우트 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/applications/{publicId}/scout")
    @PreAuthorize("hasRole('ADMIN')")
    fun scoutApplicant(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ApplicationDetailResponse>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)
        app.scout()
        applicationRepository.save(app)
        auditService.record("APPLICATION", app.id, "SCOUTED", actorId, "ADMIN")
        val result = applicationUseCase.getAdminApplicationDetail(publicId)
        return ApiResponse.ok(result).toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // CONTRACTS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "전체 계약 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/contracts")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminContracts(
        @RequestParam(required = false) status: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<AdminContractListResponse>> {
        val statusFilter = status?.let { runCatching { ContractStatus.valueOf(it) }.getOrNull() }
        val (contracts, total) = contractRepository.findAll(statusFilter, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = contracts.map { c ->
            AdminContractItem(
                publicId = c.publicId,
                status = c.status,
                workerUserId = c.workerUserId,
                employerUserId = c.employerUserId,
                jobId = c.jobId,
                startDate = c.startDate?.toString(),
                endDate = c.endDate?.toString(),
                payAmount = c.payAmount,
                payUnit = c.payUnit?.name,
                createdAt = c.createdAt,
            )
        }

        return ApiResponse.ok(AdminContractListResponse(
            content = content, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "계약 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/contracts/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminContractDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<AdminContractDetail>> {
        val c = contractRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Contract", publicId)
        return ApiResponse.ok(AdminContractDetail(
            publicId = c.publicId,
            status = c.status,
            workerUserId = c.workerUserId,
            employerUserId = c.employerUserId,
            jobId = c.jobId,
            applicationId = c.applicationId,
            startDate = c.startDate?.toString(),
            endDate = c.endDate?.toString(),
            payAmount = c.payAmount,
            payUnit = c.payUnit?.name,
            terms = c.terms,
            documentUrl = c.documentUrl,
            sentAt = c.sentAt,
            employerSignedAt = c.employerSignedAt,
            workerSignedAt = c.workerSignedAt,
            createdAt = c.createdAt,
        )).toResponseEntity()
    }

    @Operation(summary = "계약 상태 변경 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/contracts/{publicId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    fun patchContractStatus(
        @PathVariable publicId: UUID,
        @RequestBody req: PatchContractStatusRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val contract = contractRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Contract", publicId)

        val before = contract.status.name
        val newStatus = runCatching { ContractStatus.valueOf(req.status) }.getOrNull()
            ?: throw BusinessException("Invalid contract status: ${req.status}", "INVALID_STATUS")
        contract.status = newStatus
        if (newStatus == ContractStatus.CANCELLED) {
            contract.cancelledAt = Instant.now()
        }
        contractRepository.save(contract)

        auditService.record("Contract", contract.id, "STATUS_CHANGED", actorId, "ADMIN",
            oldData = mapOf("status" to before),
            newData = mapOf("status" to newStatus.name))

        return ApiResponse.ok(mapOf<String, Any>(
            "publicId" to contract.publicId,
            "status" to contract.status.name,
        ), "계약 상태가 변경되었습니다.").toResponseEntity()
    }

    @Operation(summary = "계약 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/contracts/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteContract(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val contract = contractRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Contract", publicId)
        contract.softDelete()
        contractRepository.save(contract)
        auditService.record("Contract", contract.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "계약 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/contracts")
    @PreAuthorize("hasRole('ADMIN')")
    fun createContract(
        @RequestBody req: AdminUpsertContractRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val job = jobRepository.findByPublicId(req.jobPublicId)
            ?: throw NotFoundException("Job", req.jobPublicId)
        val workerUser = userRepository.findByPublicId(req.workerPublicId)
            ?: throw NotFoundException("Worker", req.workerPublicId)
        val employerUser = userRepository.findByPublicId(req.employerPublicId)
            ?: throw NotFoundException("Employer", req.employerPublicId)
        val contract = Contract().apply {
            applicationId = req.applicationId ?: 0L
            jobId = job.id
            employerUserId = employerUser.id
            workerUserId = workerUser.id
            startDate = req.startDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            endDate = req.endDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            payAmount = req.payAmount
            payUnit = req.payUnit?.let { runCatching { PayUnit.valueOf(it) }.getOrNull() }
            terms = req.terms
            status = ContractStatus.DRAFT
        }
        val saved = contractRepository.save(contract)
        auditService.record("Contract", saved.id, "CREATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to saved.publicId.toString()), "계약이 생성되었습니다.").toResponseEntity()
    }

    @Operation(summary = "계약 수정 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/contracts/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateContract(
        @PathVariable publicId: UUID,
        @RequestBody req: AdminUpsertContractRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val contract = contractRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Contract", publicId)
        req.startDate?.let { contract.startDate = runCatching { LocalDate.parse(it) }.getOrNull() }
        req.endDate?.let { contract.endDate = runCatching { LocalDate.parse(it) }.getOrNull() }
        req.payAmount?.let { contract.payAmount = it }
        req.payUnit?.let { s -> runCatching { PayUnit.valueOf(s) }.getOrNull()?.let { contract.payUnit = it } }
        req.terms?.let { contract.terms = it }
        req.documentUrl?.let { contract.documentUrl = it }
        contractRepository.save(contract)
        auditService.record("Contract", contract.id, "UPDATED_BY_ADMIN", actorId, "ADMIN")
        return ApiResponse.ok(mapOf<String, Any>("publicId" to contract.publicId.toString()), "계약이 수정되었습니다.").toResponseEntity()
    }

    @Operation(summary = "지원 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/applications/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteApplication(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val app = applicationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Application", publicId)
        app.softDelete()
        applicationRepository.save(app)
        auditService.record("Application", app.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "알림 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/notifications")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminNotifications(
        @RequestParam(required = false) userId: Long?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<AdminNotificationListResponse>> {
        val (notifications, total) = notificationRepository.findAll(userId, null, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = notifications.map { n ->
            AdminNotificationItem(
                publicId = n.publicId,
                userId = n.userId,
                type = n.type.name,
                title = n.title,
                body = n.body,
                isRead = n.isRead,
                createdAt = n.createdAt,
            )
        }

        return ApiResponse.ok(AdminNotificationListResponse(
            content = content, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "알림 브로드캐스트 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/notifications/broadcast")
    @PreAuthorize("hasRole('ADMIN')")
    fun broadcastNotification(
        @RequestBody req: BroadcastNotificationRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val type = runCatching { NotificationType.valueOf(req.type) }.getOrNull()
            ?: NotificationType.SYSTEM

        val targetUserIds: List<Long> = if (req.userId != null) {
            listOf(req.userId)
        } else {
            // broadcast to all active WORKER and TEAM_LEADER users
            val (workers, _) = userRepository.findWorkers(0, 500, UserStatus.ACTIVE)
            workers.map { it.id }
        }

        var lastSaved: Notification? = null
        targetUserIds.forEach { uid ->
            val notification = Notification().apply {
                this.userId = uid
                this.type = type
                this.title = req.title
                this.body = req.body
            }
            lastSaved = notificationRepository.save(notification)
        }

        auditService.record("Notification", lastSaved?.id ?: 0L, "BROADCAST_CREATED", actorId, "ADMIN",
            newData = mapOf("targetCount" to targetUserIds.size, "type" to type.name, "title" to req.title))

        return ApiResponse.ok(mapOf<String, Any>(
            "count" to targetUserIds.size,
            "type" to type.name,
        ), "${targetUserIds.size}명에게 알림이 전송되었습니다.").toResponseEntity()
    }

    @Operation(summary = "알림 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/notifications/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteNotification(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val notification = notificationRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Notification", publicId)
        notification.softDelete()
        notificationRepository.save(notification)
        auditService.record("Notification", notification.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // SMS TEMPLATES
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "SMS 템플릿 목록 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/sms-templates")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminSmsTemplates(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) isActive: Boolean?,
    ): ResponseEntity<ApiResponse<AdminSmsTemplateListResponse>> {
        val (templates, total) = smsTemplateRepository.findAll(isActive, page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = templates.map { t ->
            SmsTemplateItem(
                publicId = t.publicId,
                code = t.code,
                name = t.name,
                locale = t.locale,
                content = t.content,
                variables = t.variables,
                isActive = t.isActive,
                createdAt = t.createdAt,
                updatedAt = t.updatedAt,
            )
        }

        return ApiResponse.ok(AdminSmsTemplateListResponse(
            content = content, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "SMS 템플릿 상세 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/sms-templates/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdminSmsTemplateDetail(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<SmsTemplateItem>> {
        val t = smsTemplateRepository.findByPublicId(publicId)
            ?: throw NotFoundException("SmsTemplate", publicId)
        return ApiResponse.ok(SmsTemplateItem(
            publicId = t.publicId, code = t.code, name = t.name, locale = t.locale,
            content = t.content, variables = t.variables, isActive = t.isActive,
            createdAt = t.createdAt, updatedAt = t.updatedAt,
        )).toResponseEntity()
    }

    @Operation(summary = "SMS 템플릿 생성 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/sms-templates")
    @PreAuthorize("hasRole('ADMIN')")
    fun createAdminSmsTemplate(
        @RequestBody req: UpsertSmsTemplateRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SmsTemplateItem>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val template = SmsTemplate().apply {
            code = req.code
            name = req.name
            locale = req.locale
            content = req.content
            variables = req.variables
            isActive = req.isActive
        }
        val saved = smsTemplateRepository.save(template)
        auditService.record("SmsTemplate", saved.id, "CREATED", actorId, "ADMIN",
            newData = mapOf("code" to saved.code, "locale" to saved.locale))
        return ApiResponse.ok(SmsTemplateItem(
            publicId = saved.publicId, code = saved.code, name = saved.name, locale = saved.locale,
            content = saved.content, variables = saved.variables, isActive = saved.isActive,
            createdAt = saved.createdAt, updatedAt = saved.updatedAt,
        )).toResponseEntity()
    }

    @Operation(summary = "SMS 템플릿 수정 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PutMapping("/sms-templates/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateAdminSmsTemplate(
        @PathVariable publicId: UUID,
        @RequestBody req: UpsertSmsTemplateRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SmsTemplateItem>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val template = smsTemplateRepository.findByPublicId(publicId)
            ?: throw NotFoundException("SmsTemplate", publicId)

        val before = mapOf("code" to template.code, "name" to template.name, "content" to template.content)
        template.code = req.code
        template.name = req.name
        template.locale = req.locale
        template.content = req.content
        template.variables = req.variables
        template.isActive = req.isActive
        template.updatedAt = Instant.now()
        val saved = smsTemplateRepository.save(template)

        auditService.record("SmsTemplate", saved.id, "UPDATED", actorId, "ADMIN",
            oldData = before, newData = mapOf("code" to saved.code, "name" to saved.name))

        return ApiResponse.ok(SmsTemplateItem(
            publicId = saved.publicId, code = saved.code, name = saved.name, locale = saved.locale,
            content = saved.content, variables = saved.variables, isActive = saved.isActive,
            createdAt = saved.createdAt, updatedAt = saved.updatedAt,
        )).toResponseEntity()
    }

    @Operation(summary = "SMS 템플릿 소프트 삭제 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @DeleteMapping("/sms-templates/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun deleteAdminSmsTemplate(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val template = smsTemplateRepository.findByPublicId(publicId)
            ?: throw NotFoundException("SmsTemplate", publicId)
        template.softDelete()
        smsTemplateRepository.save(template)
        auditService.record("SmsTemplate", template.id, "SOFT_DELETED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    @Operation(summary = "SMS 템플릿 복구 (관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/sms-templates/{publicId}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    fun restoreAdminSmsTemplate(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Nothing>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val template = smsTemplateRepository.findByPublicId(publicId)
            ?: throw NotFoundException("SmsTemplate", publicId)
        template.restore()
        smsTemplateRepository.save(template)
        auditService.record("SmsTemplate", template.id, "RESTORED", actorId, "ADMIN")
        return ApiResponse.noContent().toResponseEntity()
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN ROLE MANAGEMENT (SUPER_ADMIN only)
    // ═══════════════════════════════════════════════════════

    @Operation(summary = "어드민 목록 (슈퍼 관리자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    fun getAdmins(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<AdminUserListResponse>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        adminPermission.requireSuperAdmin(actorId)

        val (admins, total) = userRepository.findAdmins(page, size)
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        val content = admins.map { u ->
            AdminUserItem(
                publicId = u.publicId,
                phone = u.phone,
                status = u.status,
                adminRole = u.adminRole?.name,
                createdAt = u.createdAt,
            )
        }

        return ApiResponse.ok(AdminUserListResponse(
            content = content, page = page, size = size,
            totalElements = total, totalPages = totalPages,
            isFirst = page == 0, isLast = page >= totalPages - 1,
        )).toResponseEntity()
    }

    @Operation(summary = "어드민 역할 할당 (슈퍼 관리자)", security = [SecurityRequirement(name = "Bearer")])
    @PatchMapping("/admins/{publicId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    fun assignAdminRole(
        @PathVariable publicId: UUID,
        @RequestBody req: AssignAdminRoleRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<Map<String, Any?>>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        adminPermission.requireSuperAdmin(actorId)

        val user = userRepository.findByPublicId(publicId)
            ?: throw NotFoundException("User", publicId)

        val before = user.adminRoleStr
        if (req.adminRole != null) {
            runCatching { AdminRole.valueOf(req.adminRole) }.getOrNull()
                ?: throw BusinessException("Invalid adminRole: ${req.adminRole}", "INVALID_ROLE")
        }
        user.adminRoleStr = req.adminRole
        userRepository.saveAndFlush(user)

        auditService.record("User", user.id, "ADMIN_ROLE_ASSIGNED", actorId, "SUPER_ADMIN",
            oldData = mapOf("adminRole" to before),
            newData = mapOf("adminRole" to req.adminRole))

        return ApiResponse.ok(mapOf<String, Any?>(
            "publicId" to user.publicId,
            "adminRole" to user.adminRole?.name,
        ), "어드민 역할이 변경되었습니다.").toResponseEntity()
    }
}

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — COMPANIES
// ═══════════════════════════════════════════════════════════

data class AdminCompanyItem(
    val publicId: UUID,
    val name: String,
    val businessRegistrationNumber: String?,
    val status: CompanyStatus,
    val isVerified: Boolean,
    val siteCount: Int,
    val activeJobCount: Int,
    val createdAt: Instant,
)

data class AdminCompanyListResponse(
    val content: List<AdminCompanyItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class AdminCompanyDetailResponse(
    val publicId: UUID,
    val name: String,
    val businessRegistrationNumber: String?,
    val ceoName: String?,
    val address: String?,
    val phone: String?,
    val email: String?,
    val websiteUrl: String?,
    val description: String?,
    val logoUrl: String?,
    val status: String,
    val isVerified: Boolean,
    val adminNote: String?,
    val rejectionReason: String?,
    val verifiedAt: Instant?,
    val createdAt: Instant,
    val sites: List<AdminSiteItem>,
    val recentJobs: List<AdminJobItem>,
)

data class PatchCompanyStatusRequest(
    val status: String,
    val adminNote: String? = null,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — SITES
// ═══════════════════════════════════════════════════════════

data class AdminSiteItem(
    val publicId: UUID,
    val name: String,
    val address: String?,
    val sido: String?,
    val sigungu: String?,
    val status: String,
    val activeJobCount: Int,
    val createdAt: Instant,
)

data class AdminSiteListResponse(
    val content: List<AdminSiteItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — JOBS
// ═══════════════════════════════════════════════════════════

data class AdminJobItem(
    val publicId: UUID,
    val title: String,
    val companyName: String,
    val companyPublicId: UUID,
    val siteName: String,
    val sitePublicId: UUID,
    val sido: String?,
    val sigungu: String?,
    val categoryName: String?,
    val payMin: Int?,
    val payMax: Int?,
    val payUnit: String,
    val accommodationProvided: Boolean,
    val mealProvided: Boolean,
    val transportationProvided: Boolean,
    val status: String,
    val applicationCount: Int,
    val viewCount: Int,
    val createdAt: Instant,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — WORKERS
// ═══════════════════════════════════════════════════════════

data class AdminWorkerItem(
    val userId: Long,
    val publicId: UUID,
    val phone: String,
    val role: String,
    val status: String,
    val fullName: String?,
    val nationality: String?,
    val visaType: String?,
    val createdAt: Instant,
)

data class AdminWorkerListResponse(
    val content: List<AdminWorkerItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class AdminWorkerDetail(
    val publicId: UUID,
    val phone: String,
    val status: UserStatus,
    val role: UserRole,
    val fullName: String,
    val birthDate: String?,
    val nationality: String,
    val visaType: String,
    val healthCheckStatus: String,
    val languages: List<Map<String, String>>,
    val certifications: List<Map<String, String>>,
    val desiredPayMin: Int?,
    val desiredPayMax: Int?,
    val desiredPayUnit: String?,
    val profileImageUrl: String?,
    val createdAt: Instant,
    val deletedAt: Instant?,
    val adminNote: String?,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — EMPLOYERS
// ═══════════════════════════════════════════════════════════

data class AdminEmployerItem(
    val publicId: UUID,
    val phone: String,
    val status: UserStatus,
    val companyName: String?,
    val fullName: String?,
    val createdAt: Instant,
    val deletedAt: Instant?,
)

data class AdminEmployerListResponse(
    val content: List<AdminEmployerItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class AdminEmployerDetail(
    val publicId: UUID,
    val phone: String,
    val status: UserStatus,
    val fullName: String?,
    val email: String?,
    val createdAt: Instant,
    val deletedAt: Instant?,
    val adminNote: String?,
)

data class PatchUserStatusRequest(val status: String)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — TEAMS
// ═══════════════════════════════════════════════════════════

data class AdminTeamItem(
    val publicId: UUID,
    val name: String,
    val teamType: String,
    val leaderId: Long,
    val companyId: Long?,
    val memberCount: Int,
    val status: String,
    val isNationwide: Boolean,
    val createdAt: Instant,
)

data class AdminTeamListResponse(
    val content: List<AdminTeamItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — CONTRACTS
// ═══════════════════════════════════════════════════════════

data class AdminContractItem(
    val publicId: UUID,
    val status: ContractStatus,
    val workerUserId: Long,
    val employerUserId: Long,
    val jobId: Long,
    val startDate: String?,
    val endDate: String?,
    val payAmount: Int?,
    val payUnit: String?,
    val createdAt: Instant,
)

data class AdminContractListResponse(
    val content: List<AdminContractItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class AdminContractDetail(
    val publicId: UUID,
    val status: ContractStatus,
    val workerUserId: Long,
    val employerUserId: Long,
    val jobId: Long,
    val applicationId: Long,
    val startDate: String?,
    val endDate: String?,
    val payAmount: Int?,
    val payUnit: String?,
    val terms: String?,
    val documentUrl: String?,
    val sentAt: Instant?,
    val employerSignedAt: Instant?,
    val workerSignedAt: Instant?,
    val createdAt: Instant,
)

data class PatchContractStatusRequest(val status: String)

data class AdminUpsertCompanyRequest(
    val name: String = "",
    val businessRegistrationNumber: String? = null,
    val ceoName: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val websiteUrl: String? = null,
    val description: String? = null,
    val status: String? = null,
)

data class AdminUpsertSiteRequest(
    val companyPublicId: UUID = UUID.randomUUID(),
    val name: String = "",
    val address: String = "",
    val addressDetail: String? = null,
    val description: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val status: String? = null,
)

data class AdminUpsertJobRequest(
    val sitePublicId: UUID = UUID.randomUUID(),
    val title: String = "",
    val description: String? = null,
    val requiredCount: Int? = null,
    val applicationTypes: List<String>? = null,
    val payMin: Int? = null,
    val payMax: Int? = null,
    val payUnit: String? = null,
    val visaRequirements: List<String>? = null,
    val certificationRequirements: List<String>? = null,
    val healthCheckRequired: Boolean? = null,
    val alwaysOpen: Boolean? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val accommodationProvided: Boolean? = null,
    val mealProvided: Boolean? = null,
    val transportationProvided: Boolean? = null,
    val publish: Boolean? = null,
)

data class AdminUpsertContractRequest(
    val jobPublicId: UUID = UUID.randomUUID(),
    val workerPublicId: UUID = UUID.randomUUID(),
    val employerPublicId: UUID = UUID.randomUUID(),
    val applicationId: Long? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val payAmount: Int? = null,
    val payUnit: String? = null,
    val terms: String? = null,
    val documentUrl: String? = null,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

data class AdminNotificationItem(
    val publicId: UUID,
    val userId: Long,
    val type: String,
    val title: String,
    val body: String,
    val isRead: Boolean,
    val createdAt: Instant,
)

data class AdminNotificationListResponse(
    val content: List<AdminNotificationItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class BroadcastNotificationRequest(
    val userId: Long?,
    val type: String,
    val title: String,
    val body: String,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — SMS TEMPLATES
// ═══════════════════════════════════════════════════════════

data class SmsTemplateItem(
    val publicId: UUID,
    val code: String,
    val name: String,
    val locale: String,
    val content: String,
    val variables: List<String>,
    val isActive: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class AdminSmsTemplateListResponse(
    val content: List<SmsTemplateItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class UpsertSmsTemplateRequest(
    val code: String,
    val name: String,
    val locale: String,
    val content: String,
    val variables: List<String>,
    val isActive: Boolean = true,
)

// ═══════════════════════════════════════════════════════════
// DATA CLASSES — ADMIN USERS
// ═══════════════════════════════════════════════════════════

data class AdminUserItem(
    val publicId: UUID,
    val phone: String,
    val status: UserStatus,
    val adminRole: String?,
    val createdAt: Instant,
)

data class AdminUserListResponse(
    val content: List<AdminUserItem>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val isFirst: Boolean,
    val isLast: Boolean,
)

data class AssignAdminRoleRequest(val adminRole: String?)

data class UpdateApplicationStatusRequest(val status: String, val note: String? = null)
