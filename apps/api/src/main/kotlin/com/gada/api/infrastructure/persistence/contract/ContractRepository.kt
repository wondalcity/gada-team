package com.gada.api.infrastructure.persistence.contract

import com.gada.api.domain.contract.Contract
import com.gada.api.domain.contract.ContractStatus
import com.gada.api.domain.contract.QContract
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ContractRepository(
    private val em: EntityManager,
    private val qf: JPAQueryFactory,
) {
    private val c = QContract.contract

    fun findByPublicId(publicId: UUID): Contract? =
        qf.selectFrom(c)
            .where(c.publicId.eq(publicId), c.deletedAt.isNull)
            .fetchOne()

    fun findByApplicationId(applicationId: Long): Contract? =
        qf.selectFrom(c)
            .where(c.applicationId.eq(applicationId), c.deletedAt.isNull)
            .fetchFirst()

    fun findByWorkerUserId(workerUserId: Long): List<Contract> =
        qf.selectFrom(c)
            .where(c.workerUserId.eq(workerUserId), c.deletedAt.isNull)
            .orderBy(c.createdAt.desc())
            .fetch()

    fun findByEmployerUserId(employerUserId: Long): List<Contract> =
        qf.selectFrom(c)
            .where(c.employerUserId.eq(employerUserId), c.deletedAt.isNull)
            .orderBy(c.createdAt.desc())
            .fetch()

    fun findAll(status: ContractStatus? = null, page: Int, size: Int): Pair<List<Contract>, Long> {
        val statusPred = status?.let { c.status.eq(it) }

        val total = qf.select(c.id.count())
            .from(c)
            .where(c.deletedAt.isNull, statusPred)
            .fetchOne() ?: 0L

        val content = qf.selectFrom(c)
            .where(c.deletedAt.isNull, statusPred)
            .orderBy(c.createdAt.desc())
            .offset((page * size).toLong())
            .limit(size.toLong())
            .fetch()

        return Pair(content, total)
    }

    fun save(contract: Contract): Contract {
        return if (contract.id == 0L) {
            em.persist(contract)
            em.flush()
            contract
        } else {
            val merged = em.merge(contract)
            em.flush()
            merged
        }
    }
}
