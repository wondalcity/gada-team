package com.gada.api.application.company

import com.gada.api.application.audit.AuditService
import com.gada.api.common.exception.ConflictException
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.domain.company.Company
import com.gada.api.domain.company.Site
import com.gada.api.domain.job.JobStatus
import com.gada.api.infrastructure.persistence.company.CompanyRepository
import com.gada.api.infrastructure.persistence.company.SiteRepository
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.user.EmployerProfileRepository
import com.gada.api.presentation.v1.company.CompanyResponse
import com.gada.api.presentation.v1.company.CreateCompanyRequest
import com.gada.api.presentation.v1.company.CreateSiteRequest
import com.gada.api.presentation.v1.company.SiteResponse
import com.gada.api.presentation.v1.company.UpdateCompanyRequest
import com.gada.api.presentation.v1.company.UpdateSiteRequest
import com.gada.api.presentation.v1.job.JobListResponse
import com.gada.api.presentation.v1.job.JobSummaryResponse
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.ceil

@Service
@Transactional
class CompanyUseCase(
    private val companyRepository: CompanyRepository,
    private val siteRepository: SiteRepository,
    private val jobRepository: JobRepository,
    private val employerProfileRepository: EmployerProfileRepository,
    private val auditService: AuditService,
) {

    fun createCompany(userId: Long, req: CreateCompanyRequest): CompanyResponse {
        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        if (profile.companyId != null) {
            throw ConflictException("Company already exists for this employer", "COMPANY_ALREADY_EXISTS")
        }

        val company = Company().apply {
            name = req.name
            businessRegistrationNumber = req.businessRegistrationNumber
            ceoName = req.ceoName
            address = req.address
            phone = req.phone
            email = req.email
            websiteUrl = req.websiteUrl
            description = req.description
        }
        val saved = companyRepository.save(company)

        profile.companyId = saved.id
        employerProfileRepository.save(profile)

        auditService.record("COMPANY", saved.id, "CREATE", actorId = userId, actorRole = "EMPLOYER",
            newData = saved.toResponse(siteCount = 0, activeJobCount = 0))

        return saved.toResponse(siteCount = 0, activeJobCount = 0)
    }

    @Transactional(readOnly = true)
    fun getMyCompany(userId: Long): CompanyResponse {
        val company = companyRepository.findByEmployerUserId(userId)
            ?: throw NotFoundException("Company")

        val sites = siteRepository.findByCompanyId(company.id)
        val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.status == JobStatus.PUBLISHED }

        return company.toResponse(siteCount = sites.size, activeJobCount = activeJobCount)
    }

    @Transactional(readOnly = true)
    fun getByPublicId(publicId: UUID): CompanyResponse {
        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)

        val sites = siteRepository.findByCompanyId(company.id)
        val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.status == JobStatus.PUBLISHED }

        return company.toResponse(siteCount = sites.size, activeJobCount = activeJobCount)
    }

    fun updateCompany(userId: Long, publicId: UUID, req: UpdateCompanyRequest): CompanyResponse {
        val company = resolveCompanyForUserByPublicId(userId, publicId)

        req.name?.let { company.name = it }
        req.businessRegistrationNumber?.let { company.businessRegistrationNumber = it }
        req.ceoName?.let { company.ceoName = it }
        req.address?.let { company.address = it }
        req.phone?.let { company.phone = it }
        req.email?.let { company.email = it }
        req.websiteUrl?.let { company.websiteUrl = it }
        req.description?.let { company.description = it }
        req.logoUrl?.let { company.logoUrl = it }

        val saved = companyRepository.save(company)
        val sites = siteRepository.findByCompanyId(saved.id)
        val (jobs, _) = jobRepository.findByCompanyId(saved.id, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.status == JobStatus.PUBLISHED }

        auditService.record("COMPANY", saved.id, "UPDATE", actorId = userId, actorRole = "EMPLOYER")

        return saved.toResponse(siteCount = sites.size, activeJobCount = activeJobCount)
    }

    fun createSite(userId: Long, companyPublicId: UUID, req: CreateSiteRequest): SiteResponse {
        val company = resolveCompanyForUserByPublicId(userId, companyPublicId)

        val site = Site().apply {
            this.companyId = company.id
            this.regionId = req.regionId
            name = req.name
            address = req.address
            addressDetail = req.addressDetail
            latitude = req.latitude
            longitude = req.longitude
            description = req.description
            startDate = req.startDate
            endDate = req.endDate
        }
        val saved = siteRepository.save(site)

        auditService.record("SITE", saved.id, "CREATE", actorId = userId, actorRole = "EMPLOYER")

        return saved.toResponse(companyName = company.name, activeJobCount = 0)
    }

    @Transactional(readOnly = true)
    fun getSites(userId: Long, companyPublicId: UUID): List<SiteResponse> {
        val company = resolveCompanyForUserByPublicId(userId, companyPublicId)

        val sites = siteRepository.findByCompanyId(company.id)
        return sites.map { site ->
            val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
            val activeJobCount = jobs.count { it.siteId == site.id && it.status == JobStatus.PUBLISHED }
            site.toResponse(companyName = company.name, activeJobCount = activeJobCount)
        }
    }

    @Transactional(readOnly = true)
    fun getSiteByPublicId(sitePublicId: UUID): SiteResponse {
        val site = siteRepository.findByPublicId(sitePublicId)
            ?: throw NotFoundException("Site", sitePublicId)

        val company = companyRepository.findById(site.companyId)
            ?: throw NotFoundException("Company", site.companyId)

        val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.siteId == site.id && it.status == JobStatus.PUBLISHED }

        return site.toResponse(companyName = company.name, activeJobCount = activeJobCount)
    }

    fun updateSite(userId: Long, sitePublicId: UUID, req: UpdateSiteRequest): SiteResponse {
        val site = siteRepository.findByPublicId(sitePublicId)
            ?: throw NotFoundException("Site", sitePublicId)

        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        val company = companyRepository.findById(site.companyId)
            ?: throw NotFoundException("Company", site.companyId)

        if (profile.companyId != company.id) {
            throw ForbiddenException("You do not have access to this site")
        }

        req.name?.let { site.name = it }
        req.address?.let { site.address = it }
        req.addressDetail?.let { site.addressDetail = it }
        req.description?.let { site.description = it }
        req.status?.let { site.status = it }
        req.startDate?.let { site.startDate = it }
        req.endDate?.let { site.endDate = it }

        val saved = siteRepository.save(site)

        auditService.record("SITE", saved.id, "UPDATE", actorId = userId, actorRole = "EMPLOYER")

        val (jobs, _) = jobRepository.findByCompanyId(company.id, 0, Int.MAX_VALUE)
        val activeJobCount = jobs.count { it.siteId == saved.id && it.status == JobStatus.PUBLISHED }

        return saved.toResponse(companyName = company.name, activeJobCount = activeJobCount)
    }

    fun deleteSite(userId: Long, sitePublicId: UUID) {
        val site = siteRepository.findByPublicId(sitePublicId)
            ?: throw NotFoundException("Site", sitePublicId)

        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        val company = companyRepository.findById(site.companyId)
            ?: throw NotFoundException("Company", site.companyId)

        if (profile.companyId != company.id) {
            throw ForbiddenException("You do not have access to this site")
        }

        site.softDelete()
        siteRepository.save(site)
        auditService.record("SITE", site.id, "DELETE", actorId = userId, actorRole = "EMPLOYER")
    }

    @Transactional(readOnly = true)
    fun getPublishedJobsByCompany(companyPublicId: UUID, page: Int, size: Int): JobListResponse {
        val company = companyRepository.findByPublicId(companyPublicId)
            ?: throw NotFoundException("Company", companyPublicId)

        val (jobs, total) = jobRepository.findByCompanyId(company.id, page, size)
        val published = jobs.filter { it.status == JobStatus.PUBLISHED && it.deletedAt == null }
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()

        return JobListResponse(
            content = published.map { job ->
                JobSummaryResponse(
                    publicId = job.publicId,
                    title = job.title,
                    companyPublicId = company.publicId,
                    companyName = company.name,
                    companyLogoUrl = company.logoUrl,
                    sitePublicId = job.site?.publicId,
                    siteName = job.site?.name ?: "",
                    sido = job.site?.sido ?: job.site?.region?.sido,
                    sigungu = job.site?.sigungu ?: job.site?.region?.sigungu,
                    categoryId = job.jobCategoryId,
                    categoryName = job.jobCategory?.nameKo,
                    payMin = job.payMin,
                    payMax = job.payMax,
                    payUnit = job.payUnit.name,
                    requiredCount = job.requiredCount,
                    applicationTypes = job.applicationTypes,
                    accommodationProvided = job.accommodationProvided,
                    mealProvided = job.mealProvided,
                    transportationProvided = job.transportationProvided,
                    status = job.status.name,
                    alwaysOpen = job.alwaysOpen,
                    startDate = job.startDate,
                    endDate = job.endDate,
                    viewCount = job.viewCount,
                    applicationCount = job.applicationCount,
                    publishedAt = job.publishedAt,
                    createdAt = job.createdAt,
                )
            },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
    }

    // ─── Helper ─────────────────────────────────────────────────────────────

    private fun resolveCompanyForUserByPublicId(userId: Long, publicId: UUID): Company {
        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        val company = companyRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Company", publicId)

        if (profile.companyId != company.id) {
            throw ForbiddenException("You do not have access to this company")
        }

        return company
    }
}

// ─── Extension helpers ───────────────────────────────────────────────────────

private fun Company.toResponse(siteCount: Int, activeJobCount: Int) = CompanyResponse(
    publicId = publicId,
    name = name,
    businessRegistrationNumber = businessRegistrationNumber,
    ceoName = ceoName,
    address = address,
    phone = phone,
    email = email,
    websiteUrl = websiteUrl,
    description = description,
    logoUrl = logoUrl,
    status = status,
    isVerified = isVerified,
    siteCount = siteCount,
    activeJobCount = activeJobCount,
    createdAt = createdAt,
)

private fun Site.toResponse(companyName: String, activeJobCount: Int) = SiteResponse(
    publicId = publicId,
    companyPublicId = company?.publicId,
    companyName = company?.name ?: companyName,
    name = name,
    address = address,
    addressDetail = addressDetail,
    latitude = latitude,
    longitude = longitude,
    description = description,
    status = status,
    sido = sido ?: region?.sido,
    sigungu = sigungu ?: region?.sigungu,
    activeJobCount = activeJobCount,
    startDate = startDate,
    endDate = endDate,
    createdAt = createdAt,
)
