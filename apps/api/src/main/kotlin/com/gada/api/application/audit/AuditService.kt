package com.gada.api.application.audit

import com.fasterxml.jackson.databind.ObjectMapper
import com.gada.api.domain.audit.AuditLog
import com.gada.api.infrastructure.persistence.audit.AuditRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Service
class AuditService(
    private val auditRepository: AuditRepository,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun record(
        entityType: String,
        entityId: Long,
        action: String,
        actorId: Long? = null,
        actorRole: String? = null,
        oldData: Any? = null,
        newData: Any? = null,
        requestId: String? = null,
    ) {
        try {
            val entry = AuditLog().apply {
                this.entityType = entityType
                this.entityId = entityId
                this.action = action
                this.actorId = actorId
                this.actorRole = actorRole
                this.oldData = oldData?.let { objectMapper.valueToTree(it) }
                this.newData = newData?.let { objectMapper.valueToTree(it) }
                this.requestId = requestId
            }
            auditRepository.save(entry)
        } catch (e: Exception) {
            log.error("Failed to write audit log: entityType=$entityType entityId=$entityId action=$action", e)
        }
    }
}
