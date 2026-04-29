package com.gada.api.presentation.v1.team

import com.gada.api.common.model.CertificationEntry
import com.gada.api.common.model.IntroTranslation
import com.gada.api.common.model.PortfolioEntry
import com.gada.api.common.model.RegionEntry
import java.time.Instant
import java.util.UUID

data class TeamResponse(
    val publicId: UUID,
    val name: String,
    val teamType: String,
    val leaderId: Long,
    val leaderName: String?,
    val leaderProfileImageUrl: String?,
    val companyPublicId: UUID?,
    val companyName: String?,
    val introShort: String?,
    val introLong: String?,
    val introMultilingual: Map<String, IntroTranslation>,
    val isNationwide: Boolean,
    val regions: List<RegionEntry>,
    val equipment: List<String>,
    val portfolio: List<PortfolioEntry>,
    val desiredPayMin: Int?,
    val desiredPayMax: Int?,
    val desiredPayUnit: String?,
    val coverImageUrl: String?,
    val headcountTarget: Int?,
    val memberCount: Int,
    val status: String,
    val members: List<TeamMemberResponse>?,
    val createdAt: Instant,
)

data class TeamMemberResponse(
    val memberId: Long,
    val userId: Long,
    val workerProfilePublicId: String?,
    val fullName: String?,
    val profileImageUrl: String?,
    val nationality: String?,
    val visaType: String?,
    val healthCheckStatus: String?,
    val certifications: List<CertificationEntry>,
    val role: String,
    val invitationStatus: String?,
    val joinedAt: Instant?,
    val phone: String?,
)

data class TeamListItem(
    val publicId: UUID,
    val name: String,
    val teamType: String,
    val memberCount: Int,
    val isNationwide: Boolean,
    val regions: List<RegionEntry>,
    val introShort: String?,
    val coverImageUrl: String?,
    val status: String,
    val createdAt: Instant,
)

/**
 * Response for POST /teams/{id}/invitations (phone-based invite).
 * type = "INVITED"  → registered user found; invitation record created.
 * type = "SMS_SENT" → phone not registered; SMS with app link sent instead.
 */
data class PhoneInviteResponse(
    val type: String,
    val member: TeamMemberResponse? = null,
)

data class InvitationResponse(
    val invitationId: Long,
    val teamPublicId: UUID,
    val teamName: String,
    val teamCoverImageUrl: String?,
    val invitedByName: String?,
    val invitedAt: Instant?,
    val status: String,
)
