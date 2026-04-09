package com.gada.api.application.sms

import com.gada.api.application.audit.AuditService
import com.gada.api.domain.notification.SmsSendLog
import com.gada.api.domain.notification.SmsStatus
import com.gada.api.infrastructure.persistence.sms.SmsSendLogRepository
import com.gada.api.infrastructure.persistence.sms.SmsTemplateRepository
import com.gada.api.infrastructure.sms.SmsProvider
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class SmsService(
    private val smsProvider: SmsProvider,
    private val renderer: SmsTemplateRenderer,
    private val templateRepository: SmsTemplateRepository,
    private val logRepository: SmsSendLogRepository,
    private val auditService: AuditService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Send an SMS using a named template. Resolves locale with fallback to "ko".
     * If scheduledAt is provided, defers delivery to the scheduled processor.
     */
    fun sendTemplated(
        toPhone: String,
        templateCode: String,
        locale: String,
        variables: Map<String, String>,
        triggerEvent: String? = null,
        adminUserId: Long? = null,
        userId: Long? = null,
        scheduledAt: Instant? = null,
    ): SmsSendLog {
        // Load template — try requested locale first, then fall back to "ko"
        val templates = templateRepository.findByCode(templateCode)
        val template = templates.firstOrNull { it.locale == locale }
            ?: templates.firstOrNull { it.locale == "ko" }
            ?: throw IllegalArgumentException("SMS template not found: code=$templateCode locale=$locale")

        val renderedContent = renderer.render(template.content, variables)

        val sendLog = SmsSendLog().apply {
            this.templateId = template.id
            this.templateCode = templateCode
            this.toPhone = toPhone
            this.userId = userId
            this.content = renderedContent
            this.variables = variables
            this.locale = template.locale
            this.adminUserId = adminUserId
            this.triggerEvent = triggerEvent
            this.scheduledAt = scheduledAt
        }
        logRepository.save(sendLog)

        return if (scheduledAt == null) {
            sendNow(sendLog)
        } else {
            sendLog
        }
    }

    /**
     * Send a direct (non-templated) SMS immediately.
     */
    fun sendDirect(
        toPhone: String,
        content: String,
        triggerEvent: String? = null,
        adminUserId: Long? = null,
        userId: Long? = null,
    ): SmsSendLog {
        val sendLog = SmsSendLog().apply {
            this.templateCode = null
            this.toPhone = toPhone
            this.userId = userId
            this.content = content
            this.adminUserId = adminUserId
            this.triggerEvent = triggerEvent
        }
        logRepository.save(sendLog)
        return sendNow(sendLog)
    }

    private fun sendNow(log: SmsSendLog): SmsSendLog {
        log.markSending()
        logRepository.save(log)

        val result = smsProvider.send(log.toPhone, log.content)

        return if (result.success) {
            log.markSent(result.providerMsgId, smsProvider.name)
            logRepository.save(log)
        } else {
            log.markFailed(result.errorCode, result.errorMessage)
            logRepository.save(log)
        }
    }

    @Transactional(readOnly = true)
    fun getLogs(
        status: SmsStatus? = null,
        templateCode: String? = null,
        toPhone: String? = null,
        userId: Long? = null,
        page: Int = 0,
        size: Int = 20,
    ): Pair<List<SmsSendLog>, Long> =
        logRepository.findAll(
            status = status,
            templateCode = templateCode,
            toPhone = toPhone,
            userId = userId,
            page = page,
            size = size,
        )

    @Transactional(readOnly = true)
    fun getLogByPublicId(publicId: UUID): SmsSendLog? =
        logRepository.findByPublicId(publicId)

    /**
     * Manually retry a failed SMS log. Requires FAILED status with remaining attempts.
     */
    fun retryLog(publicId: UUID, adminUserId: Long): SmsSendLog {
        val sendLog = logRepository.findByPublicId(publicId)
            ?: throw NoSuchElementException("SMS log not found: $publicId")

        check(sendLog.canRetry) {
            "SMS log cannot be retried: status=${sendLog.status} attemptCount=${sendLog.attemptCount} maxAttempts=${sendLog.maxAttempts}"
        }

        val updated = sendNow(sendLog)

        auditService.record(
            entityType = "SmsSendLog",
            entityId = updated.id,
            action = "SMS_MANUAL_RETRY",
            actorId = adminUserId,
            actorRole = "ADMIN",
            newData = mapOf("status" to updated.status, "attemptCount" to updated.attemptCount),
        )

        return updated
    }

    /**
     * Scheduled retry processor — runs every 5 minutes.
     * Picks up FAILED logs where nextRetryAt <= now and attemptCount < maxAttempts.
     */
    @Async
    @Scheduled(fixedDelay = 300_000)
    @Transactional
    fun processRetries() {
        val retryable = logRepository.findRetryable(Instant.now())
        if (retryable.isEmpty()) return
        log.info("[SMS] Processing {} retryable logs", retryable.size)
        retryable.forEach { sendNow(it) }
    }

    /**
     * Scheduled send processor — runs every 60 seconds.
     * Picks up PENDING logs with scheduledAt <= now.
     */
    @Async
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    fun processScheduled() {
        val ready = logRepository.findScheduledReady(Instant.now())
        if (ready.isEmpty()) return
        log.info("[SMS] Processing {} scheduled logs", ready.size)
        ready.forEach { sendNow(it) }
    }
}
