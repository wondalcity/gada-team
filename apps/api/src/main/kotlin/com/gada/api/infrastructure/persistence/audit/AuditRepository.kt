package com.gada.api.infrastructure.persistence.audit

import com.gada.api.domain.audit.AuditLog
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository

@Repository
class AuditRepository(private val em: EntityManager) {
    fun save(log: AuditLog): AuditLog {
        em.persist(log)
        em.flush()
        return log
    }
}
