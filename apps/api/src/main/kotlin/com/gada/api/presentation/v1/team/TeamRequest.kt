package com.gada.api.presentation.v1.team

import com.gada.api.common.model.IntroTranslation
import com.gada.api.common.model.PortfolioEntry
import com.gada.api.common.model.RegionEntry
import com.gada.api.domain.team.TeamType
import jakarta.validation.constraints.NotBlank

data class CreateTeamRequest(
    @field:NotBlank val name: String,
    val teamType: TeamType = TeamType.SQUAD,
    val introShort: String? = null,
    val introLong: String? = null,
    val introMultilingual: Map<String, IntroTranslation> = emptyMap(),
    val isNationwide: Boolean = false,
    val regions: List<RegionEntry> = emptyList(),
    val equipment: List<String> = emptyList(),
    val portfolio: List<PortfolioEntry> = emptyList(),
    val desiredPayMin: Int? = null,
    val desiredPayMax: Int? = null,
    val desiredPayUnit: String? = null,
    val coverImageUrl: String? = null,
    val headcountTarget: Int? = null,
    // For COMPANY_LINKED type only
    val companyPublicId: java.util.UUID? = null,
)

data class UpdateTeamRequest(
    val name: String? = null,
    val introShort: String? = null,
    val introLong: String? = null,
    val introMultilingual: Map<String, IntroTranslation>? = null,
    val isNationwide: Boolean? = null,
    val regions: List<RegionEntry>? = null,
    val equipment: List<String>? = null,
    val portfolio: List<PortfolioEntry>? = null,
    val desiredPayMin: Int? = null,
    val desiredPayMax: Int? = null,
    val desiredPayUnit: String? = null,
    val coverImageUrl: String? = null,
    val headcountTarget: Int? = null,
)

data class InviteMemberRequest(
    @field:NotBlank val phone: String,
)
