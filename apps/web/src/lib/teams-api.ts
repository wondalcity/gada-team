import { api } from "./api";

export interface RegionEntry {
  sido: string;
  sigungu: string;
}

export interface PortfolioEntry {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  imageUrls: string[];
}

export interface TeamMemberResponse {
  memberId: number;
  userId: number;
  workerProfilePublicId?: string;
  fullName?: string;
  profileImageUrl?: string;
  nationality?: string;
  visaType?: string;
  healthCheckStatus?: string;
  certifications: any[];
  role: "LEADER" | "MEMBER";
  invitationStatus?: string;
  joinedAt?: string;
  phone?: string;
}

export interface PhoneInviteResponse {
  type: "INVITED" | "SMS_SENT";
  member?: TeamMemberResponse;
}

export interface TeamResponse {
  publicId: string;
  name: string;
  teamType: "SQUAD" | "COMPANY_LINKED";
  leaderId: number;
  leaderName?: string;
  leaderProfileImageUrl?: string;
  companyPublicId?: string;
  companyName?: string;
  introShort?: string;
  introLong?: string;
  introMultilingual: Record<string, { short: string; long: string }>;
  isNationwide: boolean;
  regions: RegionEntry[];
  equipment: string[];
  portfolio: PortfolioEntry[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
  coverImageUrl?: string;
  headcountTarget?: number;
  memberCount: number;
  status: string;
  members?: TeamMemberResponse[];
  createdAt: string;
}

export interface TeamListItem {
  publicId: string;
  name: string;
  teamType: string;
  memberCount: number;
  isNationwide: boolean;
  regions: RegionEntry[];
  introShort?: string;
  coverImageUrl?: string;
  status: string;
  createdAt: string;
}

export interface InvitationResponse {
  invitationId: number;
  teamPublicId: string;
  teamName: string;
  teamCoverImageUrl?: string;
  invitedByName?: string;
  invitedAt?: string;
  status: string;
}

export interface SentInvitationResponse {
  invitationId: number;
  teamPublicId: string;
  teamName: string;
  inviteeName?: string;
  inviteePublicId?: string;
  inviteeProfileImageUrl?: string;
  invitedAt?: string;
  status: string;
}

export interface CreateTeamPayload {
  name: string;
  teamType: "SQUAD" | "COMPANY_LINKED";
  introShort?: string;
  introLong?: string;
  introMultilingual?: Record<string, { short: string; long: string }>;
  isNationwide: boolean;
  regions: RegionEntry[];
  equipment: string[];
  portfolio: PortfolioEntry[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
  coverImageUrl?: string;
  headcountTarget?: number;
  companyPublicId?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  introShort?: string;
  introLong?: string;
  isNationwide?: boolean;
  regions?: RegionEntry[];
  equipment?: string[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
  coverImageUrl?: string;
  headcountTarget?: number;
}

export interface TeamListResponse {
  content: TeamListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TeamsFilter {
  keyword?: string;
  sido?: string;
  teamType?: string;      // SQUAD | COMPANY_LINKED
  isNationwide?: boolean;
  categoryId?: number;
  page: number;
  size: number;
}

function buildTeamsQuery(filter: TeamsFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.sido) params.set("sido", filter.sido);
  if (filter.teamType) params.set("teamType", filter.teamType);
  if (filter.isNationwide) params.set("isNationwide", "true");
  if (filter.categoryId) params.set("categoryId", String(filter.categoryId));
  params.set("page", String(filter.page));
  params.set("size", String(filter.size));
  return params;
}

// ─── Work Schedule types ──────────────────────────────────────────────────────

export type WorkScheduleStatus = "PLANNED" | "ONGOING" | "COMPLETED";

export interface WorkScheduleResponse {
  publicId: string;
  jobPublicId: string | null;
  siteName: string;
  siteAddress: string | null;
  workDescription: string;
  startDate: string;   // yyyy-MM-dd
  endDate: string | null;
  status: WorkScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobSiteItem {
  jobPublicId: string;
  jobTitle: string;
  jobStatus: string;
  siteName: string | null;
  siteAddress: string | null;
  sidoSigungu: string | null;
}

export interface CreateSchedulePayload {
  jobPublicId?: string;
  siteName?: string;
  siteAddress?: string;
  workDescription: string;
  startDate: string;
  endDate?: string;
  status?: WorkScheduleStatus;
}

export interface UpdateSchedulePayload {
  siteName?: string;
  siteAddress?: string;
  workDescription?: string;
  startDate?: string;
  endDate?: string;
  clearEndDate?: boolean;
  status?: WorkScheduleStatus;
}

export const teamsApi = {
  getTeams: (filter: TeamsFilter) =>
    api.get<TeamListResponse>(`/teams?${buildTeamsQuery(filter).toString()}`),
  getMyTeam: () => api.get<TeamResponse>("/teams/mine"),
  getLeadedTeams: () => api.get<TeamResponse[]>("/teams/led-by-me"),
  getTeam: (publicId: string) => api.get<TeamResponse>(`/teams/${publicId}`),
  createTeam: (payload: CreateTeamPayload) => api.post<TeamResponse>("/teams", payload),
  updateTeam: (publicId: string, payload: UpdateTeamPayload) =>
    api.put<TeamResponse>(`/teams/${publicId}`, payload),
  disbandTeam: (publicId: string) => api.delete<void>(`/teams/${publicId}`),

  // ─── Work Schedules ────────────────────────────────────────────────────────
  getSchedules: (teamPublicId: string) =>
    api.get<WorkScheduleResponse[]>(`/teams/${teamPublicId}/schedules`),
  createSchedule: (teamPublicId: string, payload: CreateSchedulePayload) =>
    api.post<WorkScheduleResponse>(`/teams/${teamPublicId}/schedules`, payload),
  updateSchedule: (teamPublicId: string, schedulePublicId: string, payload: UpdateSchedulePayload) =>
    api.put<WorkScheduleResponse>(`/teams/${teamPublicId}/schedules/${schedulePublicId}`, payload),
  deleteSchedule: (teamPublicId: string, schedulePublicId: string) =>
    api.delete<void>(`/teams/${teamPublicId}/schedules/${schedulePublicId}`),
  searchJobsForSchedule: (keyword: string) =>
    api.get<JobSiteItem[]>(`/worker/jobs/for-schedule?keyword=${encodeURIComponent(keyword)}&size=20`),
  inviteMember: (publicId: string, phone: string) =>
    api.post<PhoneInviteResponse>(`/teams/${publicId}/invitations`, { phone }),
  inviteMemberByProfile: (teamPublicId: string, workerProfilePublicId: string) =>
    api.post<TeamMemberResponse>(`/teams/${teamPublicId}/invitations/by-profile`, { workerProfilePublicId }),
  removeMember: (publicId: string, userId: number) =>
    api.delete<void>(`/teams/${publicId}/members/${userId}`),
  getMyInvitations: () => api.get<InvitationResponse[]>("/invitations/mine"),
  getSentInvitations: () => api.get<SentInvitationResponse[]>("/invitations/sent"),
  acceptInvitation: (id: number) => api.post<InvitationResponse>(`/invitations/${id}/accept`, {}),
  rejectInvitation: (id: number) => api.post<InvitationResponse>(`/invitations/${id}/reject`, {}),
};
