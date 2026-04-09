package com.gada.api.application.job

import com.gada.api.application.audit.AuditService
import com.gada.api.common.GeoUtils
import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.domain.company.Site
import com.gada.api.domain.job.Job
import com.gada.api.domain.job.JobCategory
import com.gada.api.domain.job.JobStatus
import com.gada.api.domain.user.PayUnit
import com.gada.api.infrastructure.persistence.company.SiteRepository
import com.gada.api.infrastructure.persistence.job.JobCategoryRepository
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.user.EmployerProfileRepository
import com.gada.api.presentation.v1.company.SiteResponse
import com.gada.api.presentation.v1.job.CreateJobRequest
import com.gada.api.presentation.v1.job.JobCategoryResponse
import com.gada.api.presentation.v1.job.JobDetailResponse
import com.gada.api.presentation.v1.job.JobListResponse
import com.gada.api.presentation.v1.job.JobSummaryResponse
import com.gada.api.presentation.v1.job.PatchJobStatusRequest
import com.gada.api.presentation.v1.job.UpdateJobRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.ceil

@Service
@Transactional
class JobUseCase(
    private val jobRepository: JobRepository,
    private val siteRepository: SiteRepository,
    private val jobCategoryRepository: JobCategoryRepository,
    private val employerProfileRepository: EmployerProfileRepository,
    private val auditService: AuditService,
) {

    @Transactional(readOnly = true)
    fun getPublishedJobs(
        keyword: String?,
        sido: String?,
        sigungu: String?,
        categoryId: Long?,
        payUnit: String?,
        payMin: Int?,
        payMax: Int?,
        applicationType: String?,
        visaType: String?,
        nationality: String?,
        healthCheckRequired: Boolean?,
        certification: String?,
        equipment: String?,
        lat: Double?,
        lng: Double?,
        radius: Double?,
        page: Int,
        size: Int,
    ): JobListResponse {
        val hasPostFilters = !applicationType.isNullOrBlank() || !visaType.isNullOrBlank() ||
                !nationality.isNullOrBlank() || !certification.isNullOrBlank() || !equipment.isNullOrBlank()
        val hasDistanceFilter = lat != null && lng != null && radius != null

        val fetchSize = when {
            hasDistanceFilter -> minOf(500, size * 20)
            hasPostFilters -> minOf(200, size * 10)
            else -> size
        }
        val fetchPage = if (fetchSize > size) 0 else page

        val (rawJobs, _) = jobRepository.findPublished(
            keyword = keyword,
            sido = sido,
            sigungu = sigungu,
            categoryId = categoryId,
            payUnit = payUnit,
            payMin = payMin,
            payMax = payMax,
            healthCheckRequired = healthCheckRequired,
            lat = lat,
            lng = lng,
            radiusKm = radius,
            page = fetchPage,
            size = fetchSize,
        )

        var filtered = rawJobs
        if (!applicationType.isNullOrBlank()) {
            filtered = filtered.filter { it.applicationTypes.contains(applicationType) }
        }
        if (!visaType.isNullOrBlank()) {
            filtered = filtered.filter { job ->
                job.visaRequirements.isEmpty() || job.visaRequirements.contains(visaType)
            }
        }
        if (!nationality.isNullOrBlank()) {
            filtered = filtered.filter { job ->
                job.nationalityRequirements.isEmpty() || job.nationalityRequirements.contains(nationality)
            }
        }
        if (!certification.isNullOrBlank()) {
            filtered = filtered.filter { job ->
                job.certificationRequirements.isEmpty() ||
                job.certificationRequirements.any { it.contains(certification, ignoreCase = true) }
            }
        }
        if (!equipment.isNullOrBlank()) {
            filtered = filtered.filter { job ->
                job.equipmentRequirements.isEmpty() ||
                job.equipmentRequirements.any { it.contains(equipment, ignoreCase = true) }
            }
        }

        data class JobWithDist(val job: Job, val distanceKm: Double?)

        var withDistance = filtered.map { job ->
            val siteLat = job.site?.latitude?.toDouble()
            val siteLng = job.site?.longitude?.toDouble()
            val dist = if (lat != null && lng != null && siteLat != null && siteLng != null) {
                GeoUtils.haversineKm(lat, lng, siteLat, siteLng)
            } else null
            JobWithDist(job, dist)
        }

        if (hasDistanceFilter) {
            withDistance = withDistance.filter { (_, dist) -> dist != null && dist <= radius!! }
            withDistance = withDistance.sortedBy { it.distanceKm ?: Double.MAX_VALUE }
        }

        val total = withDistance.size.toLong()
        val startIdx = if (fetchSize > size) page * size else 0
        val endIdx = minOf(startIdx + size, withDistance.size)
        val pageItems = if (startIdx < withDistance.size) withDistance.subList(startIdx, endIdx) else emptyList()

        val totalPages = if (size == 0) 0 else kotlin.math.ceil(total.toDouble() / size).toInt()

        return JobListResponse(
            content = pageItems.map { (job, dist) ->
                val siteLat = job.site?.latitude?.toDouble()
                val siteLng = job.site?.longitude?.toDouble()
                job.toSummary().copy(
                    distanceKm = dist?.let { kotlin.math.round(it * 10) / 10.0 },
                    siteLat = siteLat,
                    siteLng = siteLng,
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

    fun getJobDetail(publicId: UUID): JobDetailResponse {
        val job = jobRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Job", publicId)

        job.incrementViewCount()
        jobRepository.save(job)

        val site = siteRepository.findById(job.siteId)
            ?: throw NotFoundException("Site", job.siteId)

        return job.toDetail(site)
    }

    @Transactional(readOnly = true)
    fun getCategories(): List<JobCategoryResponse> =
        jobCategoryRepository.findAll().map { it.toResponse() }

    fun createJob(userId: Long, req: CreateJobRequest): JobDetailResponse {
        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        val site = siteRepository.findByPublicId(req.sitePublicId)
            ?: throw NotFoundException("Site", req.sitePublicId)

        if (site.companyId != profile.companyId) {
            throw ForbiddenException("You do not have access to this site")
        }

        val job = Job().apply {
            siteId = site.id
            companyId = site.companyId
            jobCategoryId = req.jobCategoryId
            title = req.title
            description = req.description
            requiredCount = req.requiredCount
            applicationTypes = req.applicationTypes ?: listOf("INDIVIDUAL", "TEAM", "COMPANY")
            payMin = req.payMin
            payMax = req.payMax
            payUnit = req.payUnit ?: PayUnit.DAILY
            visaRequirements = req.visaRequirements ?: emptyList()
            certificationRequirements = req.certificationRequirements ?: emptyList()
            healthCheckRequired = req.healthCheckRequired ?: false
            alwaysOpen = req.alwaysOpen ?: false
            startDate = req.startDate
            endDate = req.endDate
            accommodationProvided = req.accommodationProvided ?: false
            mealProvided = req.mealProvided ?: false
            transportationProvided = req.transportationProvided ?: false
            posterUserId = userId
        }

        val saved = jobRepository.save(job)

        auditService.record("JOB", saved.id, "CREATE", actorId = userId, actorRole = "EMPLOYER")

        return saved.toDetail(site)
    }

    fun updateJob(userId: Long, publicId: UUID, req: UpdateJobRequest): JobDetailResponse {
        val job = resolveJobForUser(userId, publicId)

        req.title?.let { job.title = it }
        req.description?.let { job.description = it }
        req.requiredCount?.let { job.requiredCount = it }
        req.applicationTypes?.let { job.applicationTypes = it }
        req.payMin?.let { job.payMin = it }
        req.payMax?.let { job.payMax = it }
        req.payUnit?.let { job.payUnit = it }
        req.visaRequirements?.let { job.visaRequirements = it }
        req.certificationRequirements?.let { job.certificationRequirements = it }
        req.healthCheckRequired?.let { job.healthCheckRequired = it }
        req.alwaysOpen?.let { job.alwaysOpen = it }
        req.startDate?.let { job.startDate = it }
        req.endDate?.let { job.endDate = it }
        req.accommodationProvided?.let { job.accommodationProvided = it }
        req.mealProvided?.let { job.mealProvided = it }
        req.transportationProvided?.let { job.transportationProvided = it }

        val saved = jobRepository.save(job)
        val site = siteRepository.findById(saved.siteId)
            ?: throw NotFoundException("Site", saved.siteId)

        auditService.record("JOB", saved.id, "UPDATE", actorId = userId, actorRole = "EMPLOYER")

        return saved.toDetail(site)
    }

    fun patchJobStatus(userId: Long, publicId: UUID, req: PatchJobStatusRequest): JobDetailResponse {
        val job = resolveJobForUser(userId, publicId)

        val oldStatus = job.status
        when (req.status) {
            JobStatus.PUBLISHED -> job.publish()
            JobStatus.PAUSED -> job.pause()
            JobStatus.CLOSED -> job.close()
            else -> job.status = req.status
        }

        val saved = jobRepository.save(job)
        val site = siteRepository.findById(saved.siteId)
            ?: throw NotFoundException("Site", saved.siteId)

        auditService.record(
            "JOB", saved.id, "STATUS_CHANGE",
            actorId = userId, actorRole = "EMPLOYER",
            oldData = mapOf("status" to oldStatus),
            newData = mapOf("status" to req.status),
        )

        return saved.toDetail(site)
    }

    fun deleteJob(userId: Long, publicId: UUID) {
        val job = resolveJobForUser(userId, publicId)
        job.softDelete()
        jobRepository.save(job)
        auditService.record("JOB", job.id, "DELETE", actorId = userId, actorRole = "EMPLOYER")
    }

    @Transactional(readOnly = true)
    fun getMyJobs(userId: Long, page: Int, size: Int): JobListResponse {
        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        val companyId = profile.companyId
            ?: throw NotFoundException("Company for employer")

        val (content, total) = jobRepository.findByCompanyId(companyId, page, size)
        return toJobListResponse(content, page, size, total)
    }

    @Transactional(readOnly = true)
    fun getAdminJobs(page: Int, size: Int, keyword: String? = null, status: String? = null, categoryId: Long? = null): JobListResponse {
        val statusFilter = status?.let { runCatching { com.gada.api.domain.job.JobStatus.valueOf(it) }.getOrNull() }
        val (content, total) = jobRepository.findAllForAdmin(page, size, keyword, statusFilter, categoryId)
        return toJobListResponse(content, page, size, total)
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private fun resolveJobForUser(userId: Long, publicId: UUID): Job {
        val profile = employerProfileRepository.findByUserId(userId)
            ?: throw ForbiddenException("Employer profile not found")

        val job = jobRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Job", publicId)

        if (job.companyId != profile.companyId) {
            throw ForbiddenException("You do not have access to this job")
        }

        return job
    }

    private fun toJobListResponse(content: List<Job>, page: Int, size: Int, total: Long): JobListResponse {
        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        return JobListResponse(
            content = content.map { it.toSummary() },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
            isFirst = page == 0,
            isLast = page >= totalPages - 1,
        )
    }
}

// ─── Extension helpers ───────────────────────────────────────────────────────

private fun Job.toSummary() = JobSummaryResponse(
    publicId = publicId,
    title = title,
    companyPublicId = company?.publicId,
    companyName = company?.name ?: "",
    companyLogoUrl = company?.logoUrl,
    sitePublicId = site?.publicId,
    siteName = site?.name ?: "",
    sido = site?.sido ?: site?.region?.sido,
    sigungu = site?.sigungu ?: site?.region?.sigungu,
    categoryId = jobCategoryId,
    categoryName = jobCategory?.nameKo,
    payMin = payMin,
    payMax = payMax,
    payUnit = payUnit.name,
    requiredCount = requiredCount,
    applicationTypes = applicationTypes,
    accommodationProvided = accommodationProvided,
    mealProvided = mealProvided,
    transportationProvided = transportationProvided,
    status = status.name,
    alwaysOpen = alwaysOpen,
    startDate = startDate,
    endDate = endDate,
    viewCount = viewCount,
    applicationCount = applicationCount,
    publishedAt = publishedAt,
    createdAt = createdAt,
)

private fun Job.toDetail(siteEntity: Site) = JobDetailResponse(
    publicId = publicId,
    sitePublicId = siteEntity.publicId,
    companyPublicId = company?.publicId ?: siteEntity.company?.publicId,
    companyName = company?.name ?: siteEntity.company?.name ?: "",
    siteName = site?.name ?: siteEntity.name,
    sido = site?.sido ?: site?.region?.sido ?: siteEntity.sido ?: siteEntity.region?.sido,
    sigungu = site?.sigungu ?: site?.region?.sigungu ?: siteEntity.sigungu ?: siteEntity.region?.sigungu,
    categoryName = jobCategory?.nameKo,
    title = title,
    description = description,
    payMin = payMin,
    payMax = payMax,
    payUnit = payUnit.name,
    applicationTypes = applicationTypes,
    accommodationProvided = accommodationProvided,
    mealProvided = mealProvided,
    transportationProvided = transportationProvided,
    requiredCount = requiredCount,
    alwaysOpen = alwaysOpen,
    startDate = startDate,
    endDate = endDate,
    status = status.name,
    viewCount = viewCount,
    applicationCount = applicationCount,
    publishedAt = publishedAt,
    createdAt = createdAt,
)

private fun Site.toSiteResponse(activeJobCount: Int) = SiteResponse(
    publicId = publicId,
    companyPublicId = company?.publicId,
    companyName = company?.name ?: "",
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

private fun JobCategory.toResponse() = JobCategoryResponse(
    id = id,
    code = code,
    nameKo = nameKo,
    nameVi = nameVi,
    parentId = parentId,
)
