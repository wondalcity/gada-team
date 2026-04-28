package com.gada.api.application.contract

import com.gada.api.domain.contract.ContractTemplate
import com.gada.api.domain.user.PayUnit
import com.gada.api.infrastructure.persistence.contract.ContractTemplateRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class ContractTemplateUseCase(private val templateRepo: ContractTemplateRepository) {

    @Transactional(readOnly = true)
    fun getTemplate(employerUserId: Long): ContractTemplateResponse =
        templateRepo.findByEmployerUserId(employerUserId)?.toResponse() ?: ContractTemplateResponse()

    @Transactional
    fun upsertTemplate(employerUserId: Long, req: UpsertContractTemplateRequest): ContractTemplateResponse {
        val existing = templateRepo.findByEmployerUserId(employerUserId)
        val template = existing ?: ContractTemplate().also { it.employerUserId = employerUserId }
        template.payAmount = req.payAmount
        template.payUnit = req.payUnit?.let { runCatching { PayUnit.valueOf(it) }.getOrNull() }
        template.terms = req.terms
        template.documentUrl = req.documentUrl
        template.updatedAt = Instant.now()
        return templateRepo.save(template).toResponse()
    }
}

data class UpsertContractTemplateRequest(
    val payAmount: Int?,
    val payUnit: String?,
    val terms: String?,
    val documentUrl: String?,
)

data class ContractTemplateResponse(
    val payAmount: Int? = null,
    val payUnit: String? = null,
    val terms: String? = null,
    val documentUrl: String? = null,
)

private fun ContractTemplate.toResponse() = ContractTemplateResponse(
    payAmount = payAmount,
    payUnit = payUnit?.name,
    terms = terms,
    documentUrl = documentUrl,
)
