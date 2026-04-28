package com.gada.api.application.contract

import com.gada.api.common.exception.ForbiddenException
import com.gada.api.common.exception.NotFoundException
import com.gada.api.domain.application.ApplicationStatus
import com.gada.api.domain.chat.ChatMessage
import com.gada.api.domain.contract.Contract
import com.gada.api.domain.contract.ContractStatus
import com.gada.api.domain.user.PayUnit
import com.gada.api.infrastructure.persistence.application.ApplicationRepository
import com.gada.api.infrastructure.persistence.chat.ChatRepository
import com.gada.api.infrastructure.persistence.contract.ContractRepository
import com.gada.api.infrastructure.persistence.job.JobRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Service
class ContractUseCase(
    private val contractRepository: ContractRepository,
    private val applicationRepository: ApplicationRepository,
    private val jobRepository: JobRepository,
    private val teamRepository: TeamRepository,
    private val chatRepository: ChatRepository,
) {
    @Transactional(readOnly = true)
    fun getWorkerContracts(workerUserId: Long): List<ContractSummary> =
        contractRepository.findByWorkerUserId(workerUserId).map { it.toSummary() }

    @Transactional(readOnly = true)
    fun getWorkerContract(workerUserId: Long, publicId: UUID): ContractDetail {
        val contract = contractRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Contract", publicId)
        if (contract.workerUserId != workerUserId) throw ForbiddenException("이 계약서에 접근할 권한이 없습니다.")
        return contract.toDetail()
    }

    @Transactional
    fun workerSign(workerUserId: Long, publicId: UUID): ContractDetail {
        val contract = contractRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Contract", publicId)
        if (contract.workerUserId != workerUserId) throw ForbiddenException("이 계약서에 접근할 권한이 없습니다.")
        if (contract.status != ContractStatus.SENT) throw ForbiddenException("서명할 수 없는 상태의 계약서입니다.")
        contract.workerSignedAt = Instant.now()
        contract.status = ContractStatus.SIGNED
        return contractRepository.save(contract).toDetail()
    }

    @Transactional
    fun createAndSend(
        employerUserId: Long,
        applicationPublicId: UUID,
        req: CreateContractRequest,
    ): ContractDetail {
        val app = applicationRepository.findByPublicId(applicationPublicId)
            ?: throw NotFoundException("Application", applicationPublicId)
        if (app.status != ApplicationStatus.HIRED)
            throw ForbiddenException("채용 확정 상태에서만 계약서를 발송할 수 있습니다.")

        val existing = contractRepository.findByApplicationId(app.id)
        if (existing != null) return existing.toDetail()

        val contract = Contract().apply {
            this.applicationId = app.id
            this.jobId = app.jobId
            this.employerUserId = employerUserId
            this.workerUserId = app.applicantUserId ?: 0L
            this.status = ContractStatus.SENT
            this.startDate = req.startDate
            this.endDate = req.endDate
            this.payAmount = req.payAmount
            this.payUnit = req.payUnit?.let { runCatching { PayUnit.valueOf(it) }.getOrNull() }
            this.terms = req.terms
            this.documentUrl = req.documentUrl
            this.sentAt = Instant.now()
        }
        val saved = contractRepository.save(contract)

        // Send CONTRACT chat message if this is a TEAM application
        if (app.teamId != null) {
            try {
                val team = teamRepository.findById(app.teamId!!)
                if (team != null) {
                    val teamPublicId = team.publicId.toString()
                    val room = chatRepository.findRoomByEmployerAndTeam(employerUserId, teamPublicId)
                    if (room != null) {
                        val msg = ChatMessage().apply {
                            this.roomId = room.id
                            this.senderId = employerUserId
                            this.content = "📄 계약서가 발송되었습니다. 확인 후 서명해 주세요."
                            this.messageType = "CONTRACT"
                            this.contractPublicId = saved.publicId
                        }
                        chatRepository.saveMessage(msg)
                        room.lastMessageAt = msg.createdAt
                        room.lastMessagePreview = msg.content.take(80)
                        room.leaderUnread += 1
                        chatRepository.saveRoom(room)
                    }
                }
            } catch (e: Exception) {
                // Non-fatal: contract was sent successfully, chat message failed silently
            }
        }

        return saved.toDetail()
    }

    @Transactional(readOnly = true)
    fun getEmployerContractByApplication(employerUserId: Long, applicationPublicId: UUID): ContractDetail? {
        val app = applicationRepository.findByPublicId(applicationPublicId)
            ?: throw NotFoundException("Application", applicationPublicId)
        val contract = contractRepository.findByApplicationId(app.id) ?: return null
        if (contract.employerUserId != employerUserId) throw ForbiddenException("이 계약서에 접근할 권한이 없습니다.")
        return contract.toDetail()
    }
}

data class CreateContractRequest(
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val payAmount: Int?,
    val payUnit: String?,
    val terms: String?,
    val documentUrl: String?,
)

data class ContractSummary(
    val publicId: UUID,
    val applicationPublicId: UUID?,
    val jobTitle: String?,
    val status: String,
    val sentAt: Instant?,
    val workerSignedAt: Instant?,
    val employerSignedAt: Instant?,
    val createdAt: Instant,
)

data class ContractDetail(
    val publicId: UUID,
    val applicationPublicId: UUID?,
    val jobTitle: String?,
    val status: String,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val payAmount: Int?,
    val payUnit: String?,
    val terms: String?,
    val documentUrl: String?,
    val sentAt: Instant?,
    val workerSignedAt: Instant?,
    val employerSignedAt: Instant?,
    val createdAt: Instant,
)

private fun Contract.toSummary() = ContractSummary(
    publicId = publicId,
    applicationPublicId = null,
    jobTitle = null,
    status = status.name,
    sentAt = sentAt,
    workerSignedAt = workerSignedAt,
    employerSignedAt = employerSignedAt,
    createdAt = createdAt,
)

private fun Contract.toDetail() = ContractDetail(
    publicId = publicId,
    applicationPublicId = null,
    jobTitle = null,
    status = status.name,
    startDate = startDate,
    endDate = endDate,
    payAmount = payAmount,
    payUnit = payUnit?.name,
    terms = terms,
    documentUrl = documentUrl,
    sentAt = sentAt,
    workerSignedAt = workerSignedAt,
    employerSignedAt = employerSignedAt,
    createdAt = createdAt,
)
