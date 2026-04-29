package com.gada.api.domain.team

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(
    name = "team_work_schedules",
    indexes = [
        Index(name = "idx_team_work_schedules_team_id", columnList = "team_id"),
        Index(name = "idx_team_work_schedules_status",  columnList = "status"),
    ]
)
class TeamWorkSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "public_id", nullable = false, unique = true, updatable = false, columnDefinition = "uuid")
    val publicId: UUID = UUID.randomUUID()

    @Column(name = "team_id", nullable = false)
    var teamId: Long = 0

    /** 채용공고와 연결된 경우 — null 허용 (커스텀 현장도 등록 가능) */
    @Column(name = "job_id")
    var jobId: Long? = null

    /** 현장 이름 (채용공고에서 불러오거나 직접 입력) */
    @Column(name = "site_name", length = 255, nullable = false)
    var siteName: String = ""

    /** 현장 주소 */
    @Column(name = "site_address", length = 500)
    var siteAddress: String? = null

    /** 투입 업무 설명 */
    @Column(name = "work_description", columnDefinition = "text", nullable = false)
    var workDescription: String = ""

    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate = LocalDate.now()

    /** null = 종료일 미정 */
    @Column(name = "end_date")
    var endDate: LocalDate? = null

    /** PLANNED | ONGOING | COMPLETED */
    @Column(name = "status", length = 20, nullable = false)
    var status: String = WorkScheduleStatus.PLANNED.name

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
}

enum class WorkScheduleStatus { PLANNED, ONGOING, COMPLETED }
