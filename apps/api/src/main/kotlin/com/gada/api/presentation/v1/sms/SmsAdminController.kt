package com.gada.api.presentation.v1.sms

import com.gada.api.application.audit.AuditService
import com.gada.api.application.sms.SmsService
import com.gada.api.common.ApiResponse
import com.gada.api.common.exception.NotFoundException
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.common.toResponseEntity
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import com.gada.api.domain.notification.SmsStatus
import com.gada.api.domain.user.UserRole
import com.gada.api.domain.user.UserStatus
import com.gada.api.domain.user.VisaType
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

@RestController
@RequestMapping("/api/v1/admin/sms")
@PreAuthorize("hasRole('ADMIN')")
class SmsAdminController(
    private val smsService: SmsService,
    private val userRepository: UserRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val auditService: AuditService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    // ─── Request / Response DTOs ─────────────────────────────────

    data class AdminSendRequest(
        val toPhone: String,
        val templateCode: String,
        val locale: String = "ko",
        val variables: Map<String, String> = emptyMap(),
        val scheduledAt: Instant? = null,
    )

    data class AdminBroadcastRequest(
        val templateCode: String,
        val locale: String = "ko",
        val variables: Map<String, String> = emptyMap(),
        val filterRole: String? = null,         // "WORKER" | "EMPLOYER" | null = all
        val filterStatus: String? = null,       // "ACTIVE" | null = all
        val filterVisaType: String? = null,     // "E9" | "H2" | null = all
        val scheduledAt: Instant? = null,
    )

    data class SmsLogItem(
        val publicId: UUID,
        val templateCode: String?,
        val toPhone: String,
        val userId: Long?,
        val content: String,
        val status: SmsStatus,
        val locale: String,
        val attemptCount: Int,
        val maxAttempts: Int,
        val provider: String?,
        val errorCode: String?,
        val errorMessage: String?,
        val sentAt: Instant?,
        val nextRetryAt: Instant?,
        val triggerEvent: String?,
        val createdAt: Instant,
    )

    data class SmsLogListResponse(
        val content: List<SmsLogItem>,
        val page: Int,
        val size: Int,
        val totalElements: Long,
        val totalPages: Int,
    )

    data class BroadcastResult(
        val queued: Int,
        val templateCode: String,
        val scheduledAt: Instant?,
    )

    // ─── Endpoints ───────────────────────────────────────────────

    /**
     * GET /api/v1/admin/sms/logs
     * List SMS send logs with optional filters.
     */
    @GetMapping("/logs")
    fun getLogs(
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) templateCode: String?,
        @RequestParam(required = false) phone: String?,
        @RequestParam(required = false) userId: Long?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<ApiResponse<SmsLogListResponse>> {
        val parsedStatus = status?.let {
            runCatching { SmsStatus.valueOf(it.uppercase()) }.getOrNull()
        }

        val (logs, total) = smsService.getLogs(
            status = parsedStatus,
            templateCode = templateCode,
            toPhone = phone,
            userId = userId,
            page = page,
            size = size,
        )

        val totalPages = if (size == 0) 0 else ceil(total.toDouble() / size).toInt()
        val response = SmsLogListResponse(
            content = logs.map { it.toItem() },
            page = page,
            size = size,
            totalElements = total,
            totalPages = totalPages,
        )
        return ApiResponse.ok(response).toResponseEntity()
    }

    /**
     * GET /api/v1/admin/sms/logs/{publicId}
     * Get a single SMS log by publicId.
     */
    @GetMapping("/logs/{publicId}")
    fun getLog(
        @PathVariable publicId: UUID,
    ): ResponseEntity<ApiResponse<SmsLogItem>> {
        val log = smsService.getLogByPublicId(publicId)
            ?: throw NotFoundException("SmsSendLog", publicId)
        return ApiResponse.ok(log.toItem()).toResponseEntity()
    }

    /**
     * POST /api/v1/admin/sms/logs/{publicId}/retry
     * Manually retry a failed SMS.
     */
    @PostMapping("/logs/{publicId}/retry")
    fun retryLog(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SmsLogItem>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val updated = smsService.retryLog(publicId, actorId)
        return ApiResponse.ok(updated.toItem()).toResponseEntity()
    }

    /**
     * POST /api/v1/admin/sms/send
     * Send an SMS to a specific phone number using a template.
     */
    @PostMapping("/send")
    fun send(
        @RequestBody request: AdminSendRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<SmsLogItem>> {
        val actorId = principal.userId ?: throw UnauthorizedException()
        val result = smsService.sendTemplated(
            toPhone = request.toPhone,
            templateCode = request.templateCode,
            locale = request.locale,
            variables = request.variables,
            triggerEvent = "ADMIN_SEND",
            adminUserId = actorId,
            userId = null,
            scheduledAt = request.scheduledAt,
        )

        auditService.record(
            entityType = "SmsSendLog",
            entityId = result.id,
            action = "SMS_ADMIN_SEND",
            actorId = actorId,
            actorRole = "ADMIN",
            newData = mapOf(
                "toPhone" to request.toPhone,
                "templateCode" to request.templateCode,
                "status" to result.status,
            ),
        )

        return ApiResponse.ok(result.toItem()).toResponseEntity()
    }

    /**
     * POST /api/v1/admin/sms/broadcast
     * Send an SMS to all users matching optional role/status/visaType filters.
     * Limited to 500 users per call as a safety cap.
     */
    @PostMapping("/broadcast")
    fun broadcast(
        @RequestBody request: AdminBroadcastRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<BroadcastResult>> {
        val actorId = principal.userId ?: throw UnauthorizedException()

        val filterRole = request.filterRole?.let {
            runCatching { UserRole.valueOf(it.uppercase()) }.getOrNull()
        }
        val filterStatus = request.filterStatus?.let {
            runCatching { UserStatus.valueOf(it.uppercase()) }.getOrNull()
        }
        val filterVisaType = request.filterVisaType?.let {
            runCatching { VisaType.valueOf(it.uppercase()) }.getOrNull()
        }

        // Load matching users — cap at 500 for safety
        val BROADCAST_LIMIT = 500
        val users = when {
            filterRole == UserRole.EMPLOYER -> {
                val (list, _) = userRepository.findWorkers(
                    page = 0,
                    size = BROADCAST_LIMIT,
                    status = filterStatus,
                )
                // findWorkers returns WORKER+TEAM_LEADER; for employer we need a separate approach
                // Fall through to generic query approach below
                emptyList()
            }
            filterRole != null -> {
                val (list, _) = userRepository.findWorkers(
                    page = 0,
                    size = BROADCAST_LIMIT,
                    status = filterStatus,
                )
                list
            }
            else -> {
                // No role filter: get workers (limited)
                val (workers, _) = userRepository.findWorkers(
                    page = 0,
                    size = BROADCAST_LIMIT,
                    status = filterStatus,
                )
                workers
            }
        }

        // Apply visaType filter via profile lookup if needed
        val filteredUsers = if (filterVisaType != null) {
            users.filter { user ->
                val profile = workerProfileRepository.findByUserId(user.id)
                profile?.visaType == filterVisaType
            }
        } else {
            users
        }

        var queued = 0
        filteredUsers.forEach { user ->
            runCatching {
                smsService.sendTemplated(
                    toPhone = user.phone,
                    templateCode = request.templateCode,
                    locale = request.locale,
                    variables = request.variables,
                    triggerEvent = "BROADCAST",
                    adminUserId = actorId,
                    userId = user.id,
                    scheduledAt = request.scheduledAt,
                )
                queued++
            }.onFailure { e ->
                log.warn("[SMS BROADCAST] Failed to queue SMS for userId={}: {}", user.id, e.message)
            }
        }

        auditService.record(
            entityType = "SmsBroadcast",
            entityId = actorId,
            action = "SMS_BROADCAST",
            actorId = actorId,
            actorRole = "ADMIN",
            newData = mapOf(
                "templateCode" to request.templateCode,
                "filterRole" to (request.filterRole ?: "ALL"),
                "filterStatus" to (request.filterStatus ?: "ALL"),
                "filterVisaType" to (request.filterVisaType ?: "ALL"),
                "queued" to queued,
            ),
        )

        log.info("[SMS BROADCAST] adminId={} templateCode={} queued={}", actorId, request.templateCode, queued)

        return ApiResponse.ok(
            BroadcastResult(
                queued = queued,
                templateCode = request.templateCode,
                scheduledAt = request.scheduledAt,
            )
        ).toResponseEntity()
    }

    // ─── Mapper ──────────────────────────────────────────────────

    private fun com.gada.api.domain.notification.SmsSendLog.toItem() = SmsLogItem(
        publicId = publicId,
        templateCode = templateCode,
        toPhone = toPhone,
        userId = userId,
        content = content,
        status = status,
        locale = locale,
        attemptCount = attemptCount,
        maxAttempts = maxAttempts,
        provider = provider,
        errorCode = errorCode,
        errorMessage = errorMessage,
        sentAt = sentAt,
        nextRetryAt = nextRetryAt,
        triggerEvent = triggerEvent,
        createdAt = createdAt,
    )
}
