package com.gada.api.infrastructure.persistence.contract

import com.gada.api.domain.contract.ContractTemplate
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository

@Repository
class ContractTemplateRepository(private val em: EntityManager) {

    fun findByEmployerUserId(userId: Long): ContractTemplate? =
        em.createQuery("SELECT t FROM ContractTemplate t WHERE t.employerUserId = :uid", ContractTemplate::class.java)
            .setParameter("uid", userId).resultList.firstOrNull()

    fun save(template: ContractTemplate): ContractTemplate =
        if (template.id == 0L) { em.persist(template); em.flush(); template }
        else { val r = em.merge(template); em.flush(); r }
}
