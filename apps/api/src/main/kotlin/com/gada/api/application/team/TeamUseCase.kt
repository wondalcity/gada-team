package com.gada.api.application.team

import com.gada.api.application.audit.AuditService
import com.gada.api.common.exception.*
import com.gada.api.domain.team.*
import com.gada.api.infrastructure.persistence.company.CompanyRepository
import com.gada.api.infrastructure.persistence.team.TeamMemberRepository
import com.gada.api.infrastructure.persistence.team.TeamRepository
import com.gada.api.infrastructure.persistence.user.UserRepository
import com.gada.api.infrastructure.persistence.user.WorkerProfileRepository
import com.gada.api.presentation.v1.team.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class TeamUseCase(
    private val teamRepository: TeamRepository,
    private val teamMemberRepository: TeamMemberRepository,
    private val workerProfileRepository: WorkerProfileRepository,
    private val userRepository: UserRepository,
    private val companyRepository: CompanyRepository,
    private val auditService: AuditService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun createTeam(userId: Long, req: CreateTeamRequest): TeamResponse {
        var companyId: Long? = null
        var companyName: String? = null
        var companyPublicId: UUID? = null

        if (req.teamType == TeamType.COMPANY_LINKED) {
            val cpid = req.companyPublicId
                ?: throw BusinessException("기업 연결 팀에는 companyPublicId가 필요합니다.", "COMPANY_REQUIRED")
            val company = companyRepository.findByPublicId(cpid)
                ?: throw NotFoundException("Company", cpid)
            // Verify caller owns the company
            val emp = companyRepository.findByEmployerUserId(userId)
            if (emp?.id != company.id) throw ForbiddenException("해당 기업의 담당자가 아닙니다.")
            companyId = company.id
            companyName = company.name
            companyPublicId = company.publicId
        }

        val team = Team().apply {
            name = req.name
            leaderId = userId
            teamType = req.teamType
            this.companyId = companyId
            introShort = req.introShort
            introLong = req.introLong
            introMultilingual = req.introMultilingual
            isNationwide = req.isNationwide
            regions = req.regions
            equipment = req.equipment
            portfolio = req.portfolio
            desiredPayMin = req.desiredPayMin
            desiredPayMax = req.desiredPayMax
            desiredPayUnit = req.desiredPayUnit
            coverImageUrl = req.coverImageUrl
            headcountTarget = req.headcountTarget
            memberCount = 1
        }
        val saved = teamRepository.save(team)

        val leaderProfile = workerProfileRepository.findByUserId(userId)
        val leaderMember = TeamMember().apply {
            teamId = saved.id
            this.userId = userId
            role = TeamMemberRole.LEADER
            invitationStatus = InvitationStatus.ACCEPTED
            joinedAt = Instant.now()
            fullName = leaderProfile?.fullName
            profileImageUrl = leaderProfile?.profileImageUrl
            nationality = leaderProfile?.nationality
            visaType = leaderProfile?.visaType
            healthCheckStatus = leaderProfile?.healthCheckStatus
                ?: com.gada.api.domain.user.HealthCheckStatus.NOT_DONE
        }
        teamMemberRepository.save(leaderMember)

        auditService.record("TEAM", saved.id, "CREATE", actorId = userId, actorRole = "TEAM_LEADER")

        val leaderPhone = userRepository.findById(userId)?.phone
        return saved.toResponse(
            members = listOf(leaderMember.toMemberResponse(leaderPhone, leaderProfile?.publicId?.toString())),
            leaderName = leaderProfile?.fullName,
            leaderProfileImageUrl = leaderProfile?.profileImageUrl,
            companyPublicId = companyPublicId,
            companyName = companyName,
        )
    }

    @Transactional(readOnly = true)
    fun getTeamDetail(publicId: UUID): TeamResponse {
        val team = teamRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Team", publicId)

        val members = teamMemberRepository.findAllByTeamId(team.id)
        val leaderProfile = workerProfileRepository.findByUserId(team.leaderId)

        val companyName = team.company?.name
        val companyPublicId = team.company?.publicId

        // Batch-load phones so member list shows contact info
        val userIds = members.map { it.userId }
        val phoneMap = userRepository.findAllByIds(userIds).associate { it.id to it.phone }
        val profilePublicIdMap = workerProfileRepository.findAllByUserIds(userIds)
            .associate { it.userId to it.publicId.toString() }

        return team.toResponse(
            members = members.map { it.toMemberResponse(phoneMap[it.userId], profilePublicIdMap[it.userId]) },
            leaderName = leaderProfile?.fullName,
            leaderProfileImageUrl = leaderProfile?.profileImageUrl,
            companyPublicId = companyPublicId,
            companyName = companyName,
        )
    }

    @Transactional(readOnly = true)
    fun getMyTeam(userId: Long): TeamResponse {
        // Check if leader first
        val ownedTeam = teamRepository.findByLeaderId(userId)
        if (ownedTeam != null) return getTeamDetail(ownedTeam.publicId)

        // Check if member
        val memberships = teamMemberRepository.findActiveByUserId(userId)
        val teamId = memberships.firstOrNull()?.teamId
            ?: throw NotFoundException("Team")
        val team = teamRepository.findById(teamId) ?: throw NotFoundException("Team")
        return getTeamDetail(team.publicId)
    }

    @Transactional(readOnly = true)
    fun getLeadedTeams(userId: Long): List<TeamResponse> {
        return teamRepository.findAllByLeaderId(userId).map { getTeamDetail(it.publicId) }
    }

    fun updateTeam(userId: Long, publicId: UUID, req: UpdateTeamRequest): TeamResponse {
        val team = teamRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Team", publicId)
        if (team.leaderId != userId) throw ForbiddenException("팀 리더만 수정할 수 있습니다.")

        req.name?.let { team.name = it }
        req.introShort?.let { team.introShort = it }
        req.introLong?.let { team.introLong = it }
        req.introMultilingual?.let { team.introMultilingual = it }
        req.isNationwide?.let { team.isNationwide = it }
        req.regions?.let { team.regions = it }
        req.equipment?.let { team.equipment = it }
        req.portfolio?.let { team.portfolio = it }
        req.desiredPayMin?.let { team.desiredPayMin = it }
        req.desiredPayMax?.let { team.desiredPayMax = it }
        req.desiredPayUnit?.let { team.desiredPayUnit = it }
        req.coverImageUrl?.let { team.coverImageUrl = it }
        req.headcountTarget?.let { team.headcountTarget = it }

        val saved = teamRepository.save(team)
        auditService.record("TEAM", saved.id, "UPDATE", actorId = userId, actorRole = "TEAM_LEADER")
        return getTeamDetail(saved.publicId)
    }

    fun disbandTeam(userId: Long, publicId: UUID) {
        val team = teamRepository.findByPublicId(publicId)
            ?: throw NotFoundException("Team", publicId)
        if (team.leaderId != userId) throw ForbiddenException("팀 리더만 해산할 수 있습니다.")
        team.disband()
        teamRepository.save(team)
        auditService.record("TEAM", team.id, "DISBAND", actorId = userId, actorRole = "TEAM_LEADER")
    }

    fun inviteMember(leaderId: Long, teamPublicId: UUID, req: InviteMemberRequest): TeamMemberResponse {
        val team = teamRepository.findByPublicId(teamPublicId)
            ?: throw NotFoundException("Team", teamPublicId)
        if (team.leaderId != leaderId) throw ForbiddenException("팀 리더만 초대할 수 있습니다.")
        if (!team.isActive) throw BusinessException("해산된 팀입니다.", "TEAM_DISSOLVED")

        val invitee = userRepository.findByPhone(req.phone)
            ?: throw NotFoundException("해당 전화번호로 가입된 사용자")

        val existing = teamMemberRepository.findByTeamIdAndUserId(team.id, invitee.id)
        if (existing != null && existing.leftAt == null) {
            throw ConflictException("이미 팀 멤버이거나 초대 대기 중입니다.", "ALREADY_MEMBER")
        }

        val inviteeProfile = workerProfileRepository.findByUserId(invitee.id)

        val member = TeamMember().apply {
            teamId = team.id
            userId = invitee.id
            role = TeamMemberRole.MEMBER
            invitationStatus = InvitationStatus.PENDING
            invitedBy = leaderId
            invitedAt = Instant.now()
            joinedAt = Instant.now()
            fullName = inviteeProfile?.fullName
            profileImageUrl = inviteeProfile?.profileImageUrl
            nationality = inviteeProfile?.nationality
            visaType = inviteeProfile?.visaType
            healthCheckStatus = inviteeProfile?.healthCheckStatus
                ?: com.gada.api.domain.user.HealthCheckStatus.NOT_DONE
        }
        val savedMember = teamMemberRepository.save(member)
        log.info("[INVITE] team={} invitee={} by leader={}", team.id, invitee.id, leaderId)
        return savedMember.toMemberResponse(invitee.phone, inviteeProfile?.publicId?.toString())
    }

    fun removeMember(leaderId: Long, teamPublicId: UUID, userId: Long) {
        val team = teamRepository.findByPublicId(teamPublicId)
            ?: throw NotFoundException("Team", teamPublicId)
        if (team.leaderId != leaderId) throw ForbiddenException("팀 리더만 멤버를 제거할 수 있습니다.")
        if (userId == leaderId) throw BusinessException("리더는 제거할 수 없습니다.", "CANNOT_REMOVE_LEADER")

        val member = teamMemberRepository.findByTeamIdAndUserId(team.id, userId)
            ?: throw NotFoundException("TeamMember")
        member.leave()
        teamMemberRepository.save(member)
        team.memberCount = maxOf(1, team.memberCount - 1)
        teamRepository.save(team)
    }

    @Transactional(readOnly = true)
    fun getMyInvitations(userId: Long): List<InvitationResponse> {
        val pending = teamMemberRepository.findPendingByUserId(userId)
        return pending.mapNotNull { member ->
            val team = teamRepository.findById(member.teamId) ?: return@mapNotNull null
            val inviterProfile = member.invitedBy?.let { workerProfileRepository.findByUserId(it) }
            InvitationResponse(
                invitationId = member.id,
                teamPublicId = team.publicId,
                teamName = team.name,
                teamCoverImageUrl = team.coverImageUrl,
                invitedByName = inviterProfile?.fullName,
                invitedAt = member.invitedAt,
                status = member.invitationStatus?.name ?: "PENDING",
            )
        }
    }

    fun acceptInvitation(userId: Long, invitationId: Long): InvitationResponse {
        val member = teamMemberRepository.findById(invitationId)
            ?: throw NotFoundException("Invitation", invitationId)
        if (member.userId != userId) throw ForbiddenException("본인의 초대만 수락할 수 있습니다.")
        if (member.invitationStatus != InvitationStatus.PENDING) {
            throw ConflictException("이미 처리된 초대입니다.", "INVITATION_ALREADY_PROCESSED")
        }

        member.invitationStatus = InvitationStatus.ACCEPTED
        member.joinedAt = Instant.now()
        teamMemberRepository.save(member)

        val team = teamRepository.findById(member.teamId) ?: throw NotFoundException("Team")
        team.memberCount += 1
        teamRepository.save(team)

        val inviterProfile = member.invitedBy?.let { workerProfileRepository.findByUserId(it) }
        return InvitationResponse(
            invitationId = member.id,
            teamPublicId = team.publicId,
            teamName = team.name,
            teamCoverImageUrl = team.coverImageUrl,
            invitedByName = inviterProfile?.fullName,
            invitedAt = member.invitedAt,
            status = "ACCEPTED",
        )
    }

    fun rejectInvitation(userId: Long, invitationId: Long): InvitationResponse {
        val member = teamMemberRepository.findById(invitationId)
            ?: throw NotFoundException("Invitation", invitationId)
        if (member.userId != userId) throw ForbiddenException("본인의 초대만 거절할 수 있습니다.")
        if (member.invitationStatus != InvitationStatus.PENDING) {
            throw ConflictException("이미 처리된 초대입니다.", "INVITATION_ALREADY_PROCESSED")
        }

        member.invitationStatus = InvitationStatus.DECLINED
        teamMemberRepository.save(member)

        val team = teamRepository.findById(member.teamId) ?: throw NotFoundException("Team")
        val inviterProfile = member.invitedBy?.let { workerProfileRepository.findByUserId(it) }
        return InvitationResponse(
            invitationId = member.id,
            teamPublicId = team.publicId,
            teamName = team.name,
            teamCoverImageUrl = team.coverImageUrl,
            invitedByName = inviterProfile?.fullName,
            invitedAt = member.invitedAt,
            status = "DECLINED",
        )
    }

    @Transactional(readOnly = true)
    fun listTeams(page: Int, size: Int): Pair<List<TeamListItem>, Long> {
        val (teams, total) = teamRepository.findAll(page, size, TeamStatus.ACTIVE)
        return Pair(teams.map { it.toListItem() }, total)
    }
}

// ─── Extension mappers ───────────────────────────────────────────────────────

private fun Team.toResponse(
    members: List<TeamMemberResponse>?,
    leaderName: String?,
    leaderProfileImageUrl: String?,
    companyPublicId: java.util.UUID?,
    companyName: String?,
) = TeamResponse(
    publicId = publicId,
    name = name,
    teamType = teamType.name,
    leaderId = leaderId,
    leaderName = leaderName,
    leaderProfileImageUrl = leaderProfileImageUrl,
    companyPublicId = companyPublicId,
    companyName = companyName,
    introShort = introShort,
    introLong = introLong,
    introMultilingual = introMultilingual,
    isNationwide = isNationwide,
    regions = regions,
    equipment = equipment,
    portfolio = portfolio,
    desiredPayMin = desiredPayMin,
    desiredPayMax = desiredPayMax,
    desiredPayUnit = desiredPayUnit,
    coverImageUrl = coverImageUrl,
    headcountTarget = headcountTarget,
    memberCount = memberCount,
    status = status.name,
    members = members,
    createdAt = createdAt,
)

private fun Team.toListItem() = TeamListItem(
    publicId = publicId,
    name = name,
    teamType = teamType.name,
    memberCount = memberCount,
    isNationwide = isNationwide,
    regions = regions,
    introShort = introShort,
    coverImageUrl = coverImageUrl,
    status = status.name,
    createdAt = createdAt,
)

private fun TeamMember.toMemberResponse(phone: String? = null, workerProfilePublicId: String? = null) = TeamMemberResponse(
    memberId = id,
    userId = userId,
    workerProfilePublicId = workerProfilePublicId,
    fullName = fullName,
    profileImageUrl = profileImageUrl,
    nationality = nationality,
    visaType = visaType?.name,
    healthCheckStatus = healthCheckStatus?.name,
    certifications = certifications,
    role = role.name,
    invitationStatus = invitationStatus?.name,
    joinedAt = joinedAt,
    phone = phone,
)
