package com.gada.api.infrastructure.persistence.company

import com.gada.api.domain.company.QRegion
import com.gada.api.domain.company.Region
import com.querydsl.jpa.impl.JPAQueryFactory
import org.springframework.stereotype.Repository

@Repository
class RegionRepository(
    private val qf: JPAQueryFactory,
) {
    private val r = QRegion.region

    fun findAll(): List<Region> =
        qf.selectFrom(r)
            .orderBy(r.sido.asc(), r.sigungu.asc())
            .fetch()

    fun findById(id: Long): Region? =
        qf.selectFrom(r)
            .where(r.id.eq(id))
            .fetchOne()
}
