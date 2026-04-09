// Simple fetch wrapper for admin app
// Uses X-Dev-User-Id header for local dev auth bypass.

export function getAdminUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gada_admin_user_id");
}

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const devUserId = getAdminUserId();
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(devUserId ? { "X-Dev-User-Id": devUserId } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json as { data: T }).data as T;
}

// ─── Shared types ────────────────────────────────────────────────

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ─── Admin Company ───────────────────────────────────────────────

export interface AdminCompanyItem {
  publicId: string;        // UUID
  name: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  phone?: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";
  isVerified: boolean;
  siteCount: number;
  activeJobCount: number;
  adminNote?: string;
  rejectionReason?: string;
  createdAt: string;
}

export async function getAdminCompanies(params: {
  page?: number;
  size?: number;
  status?: string;
  keyword?: string;
  sido?: string;
}): Promise<PagedResponse<AdminCompanyItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  if (params.status) p.set("status", params.status);
  if (params.keyword) p.set("keyword", params.keyword);
  if (params.sido) p.set("sido", params.sido);
  return adminFetch<PagedResponse<AdminCompanyItem>>(`/admin/companies?${p.toString()}`);
}

export async function verifyCompany(publicId: string): Promise<AdminCompanyItem> {
  return adminFetch<AdminCompanyItem>(`/admin/companies/${publicId}/verify`, {
    method: "PATCH",
  });
}

// ─── Admin Job ───────────────────────────────────────────────────

export interface AdminJobItem {
  publicId: string;        // UUID
  title: string;
  companyName: string;
  companyPublicId: string;
  siteName: string;
  sitePublicId: string;
  sido?: string;
  sigungu?: string;
  categoryName?: string;
  payMin?: number;
  payMax?: number;
  payUnit: string;
  applicationTypes?: string[];  // INDIVIDUAL | TEAM | COMPANY
  accommodationProvided: boolean;
  mealProvided: boolean;
  transportationProvided: boolean;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";
  applicationCount: number;
  viewCount: number;
  createdAt: string;
}

export async function getAdminJobs(params: {
  page?: number;
  size?: number;
  status?: string;
  keyword?: string;
  payMin?: number;
  payMax?: number;
  applicationType?: string;
  categoryId?: number;
}): Promise<PagedResponse<AdminJobItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  if (params.status) p.set("status", params.status);
  if (params.keyword) p.set("keyword", params.keyword);
  if (params.payMin != null) p.set("payMin", String(params.payMin));
  if (params.payMax != null) p.set("payMax", String(params.payMax));
  if (params.applicationType) p.set("applicationType", params.applicationType);
  if (params.categoryId != null) p.set("categoryId", String(params.categoryId));
  return adminFetch<PagedResponse<AdminJobItem>>(`/admin/jobs?${p.toString()}`);
}

// ─── Admin Workers ───────────────────────────────────────────────

export interface AdminWorkerItem {
  userId: number;
  publicId: string;
  phone: string;
  role: "WORKER" | "TEAM_LEADER";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  fullName?: string;
  nationality?: string;
  visaType?: string;
  createdAt: string;
}

export async function getAdminWorkers(params: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<PagedResponse<AdminWorkerItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  if (params.status) p.set("status", params.status);
  return adminFetch<PagedResponse<AdminWorkerItem>>(`/admin/workers?${p.toString()}`);
}

// ─── Admin Company Detail ────────────────────────────────────────

export interface AdminSiteItem {
  publicId: string;
  name: string;
  address?: string;
  sido?: string;
  sigungu?: string;
  status: string;
  activeJobCount: number;
  createdAt: string;
}

export interface AdminCompanyDetail {
  publicId: string;
  name: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
  status: string;
  isVerified: boolean;
  adminNote?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
  sites: AdminSiteItem[];
  recentJobs: AdminJobItem[];
}

export async function getAdminCompanyDetail(publicId: string): Promise<AdminCompanyDetail> {
  return adminFetch<AdminCompanyDetail>(`/admin/companies/${publicId}`);
}

export async function patchCompanyStatus(
  publicId: string,
  status: string,
  adminNote?: string
): Promise<{ publicId: string; status: string; isVerified: boolean }> {
  return adminFetch<{ publicId: string; status: string; isVerified: boolean }>(
    `/admin/companies/${publicId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    }
  );
}

// ─── Admin Job Detail ────────────────────────────────────────────

export interface AdminJobDetail {
  publicId: string;
  title: string;
  description?: string;
  companyName: string;
  companyPublicId: string;
  siteName: string;
  sitePublicId: string;
  sido?: string;
  sigungu?: string;
  categoryName?: string;
  payMin?: number;
  payMax?: number;
  payUnit: string;
  requiredCount: number;
  applicationTypes: string[];
  accommodationProvided: boolean;
  mealProvided: boolean;
  transportationProvided: boolean;
  visaRequirements: string[];
  certificationRequirements: string[];
  healthCheckRequired: boolean;
  alwaysOpen: boolean;
  startDate?: string;
  endDate?: string;
  status: string;
  viewCount: number;
  applicationCount: number;
  publishedAt?: string;
  createdAt: string;
}

export async function getAdminJobDetail(publicId: string): Promise<AdminJobDetail> {
  return adminFetch<AdminJobDetail>(`/jobs/${publicId}`);
}

export async function patchAdminJobStatus(
  publicId: string,
  status: string
): Promise<AdminJobDetail> {
  return adminFetch<AdminJobDetail>(`/jobs/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Admin Sites ─────────────────────────────────────────────────

export async function getAdminSites(params: {
  page?: number;
  size?: number;
}): Promise<PagedResponse<AdminSiteItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return adminFetch<PagedResponse<AdminSiteItem>>(`/admin/sites?${p.toString()}`);
}

// ─── Admin Teams ─────────────────────────────────────────────────

export interface AdminTeamItem {
  publicId: string;
  name: string;
  teamType: "SQUAD" | "COMPANY_LINKED";
  leaderId: number;
  companyId?: number;
  memberCount: number;
  status: "ACTIVE" | "INACTIVE" | "DISSOLVED";
  isNationwide: boolean;
  createdAt: string;
}

export async function getAdminTeams(params: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<PagedResponse<AdminTeamItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  if (params.status) p.set("status", params.status);
  return adminFetch<PagedResponse<AdminTeamItem>>(`/admin/teams?${p.toString()}`);
}

// ─── Application Types ───────────────────────────────────────────

export type ApplicationStatus =
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW_PENDING"
  | "ON_HOLD"
  | "REJECTED"
  | "HIRED"
  | "WITHDRAWN";

export type ApplicationType = "INDIVIDUAL" | "TEAM" | "COMPANY";

export interface WorkerSnapshot {
  fullName: string;
  birthDate: string;
  nationality: string;
  visaType: string;
  healthCheckStatus: string;
  healthCheckExpiry?: string;
  languages: { code: string; level: string }[];
  certifications: { code: string; name: string }[];
  portfolio: { title: string; description?: string }[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
  profileImageUrl?: string;
}

export interface TeamSnapshot {
  name: string;
  type: string;
  description?: string;
  memberCount: number;
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
}

export interface ApplicationSummary {
  publicId: string;
  jobTitle: string;
  jobPublicId: string;
  companyName: string;
  applicationType: ApplicationType;
  status: ApplicationStatus;
  statusUpdatedAt: string;
  isScouted: boolean;
  isVerified: boolean;
  appliedAt: string;
  workerSnapshot: WorkerSnapshot;
}

export interface StatusHistoryEntry {
  fromStatus?: string;
  toStatus: string;
  note?: string;
  createdAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  coverLetter?: string;
  employerNote?: string;
  teamSnapshot?: TeamSnapshot;
  statusHistory: StatusHistoryEntry[];
}

export interface ApplicationPagedResponse {
  content: ApplicationSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ─── Application API Functions ───────────────────────────────────

export async function getAdminApplications(params: {
  status?: string;
  applicationType?: string;
  jobPublicId?: string;
  page?: number;
  size?: number;
}): Promise<ApplicationPagedResponse> {
  const p = new URLSearchParams();
  if (params.status) p.set("status", params.status);
  if (params.applicationType) p.set("applicationType", params.applicationType);
  if (params.jobPublicId) p.set("jobPublicId", params.jobPublicId);
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return adminFetch<ApplicationPagedResponse>(`/admin/applications?${p.toString()}`);
}

export async function getAdminApplicationDetail(publicId: string): Promise<ApplicationDetail> {
  return adminFetch<ApplicationDetail>(`/admin/applications/${publicId}`);
}

export async function verifyApplication(publicId: string): Promise<ApplicationDetail> {
  return adminFetch<ApplicationDetail>(`/admin/applications/${publicId}/verify`, {
    method: "POST",
  });
}

export async function updateApplicationStatus(
  publicId: string,
  status: string,
  note?: string
): Promise<ApplicationDetail> {
  return adminFetch<ApplicationDetail>(`/admin/applications/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(note ? { note } : {}) }),
  });
}

export async function scoutApplicant(publicId: string): Promise<ApplicationDetail> {
  return adminFetch<ApplicationDetail>(`/admin/applications/${publicId}/scout`, {
    method: "POST",
  });
}

// ─── Content Types ───────────────────────────────────────────────

export interface ContentSection {
  title: string;
  description: string;
}

export interface SkillEntry {
  name: string;
  level: string;
}

export interface PricingNote {
  type: string;
  minAmount: number;
  maxAmount: number;
  note: string | null;
}

export interface AdminCategoryItem {
  publicId: string;
  code: string;
  nameKo: string;
  nameEn: string | null;
  nameVi: string | null;
  iconUrl: string | null;
  isActive: boolean;
  contentCount: number;
}

export interface IntroContentResponse {
  publicId: string;
  categoryCode: string;
  locale: string;
  title: string;
  subtitle: string | null;
  body: string;
  heroImageUrl: string | null;
  workCharacteristics: ContentSection[];
  relatedSkills: SkillEntry[];
  pricingNotes: PricingNote[] | null;
  contentImages: { url: string; caption?: string }[];
  metaDescription: string | null;
  readingTimeMin: number | null;
  isPublished: boolean;
  updatedAt: string;
}

export interface FaqResponse {
  publicId: string;
  question: string;
  answer: string;
  sortOrder: number;
  locale: string;
  categoryCode?: string;
  isPublished: boolean;
}

export interface UpsertIntroContentRequest {
  title: string;
  subtitle: string | null;
  body: string;
  heroImageUrl: string | null;
  workCharacteristics: ContentSection[];
  relatedSkills: SkillEntry[];
  pricingNotes: PricingNote[] | null;
  contentImages: { url: string; caption?: string }[];
  metaDescription: string | null;
  readingTimeMin: number | null;
}

export interface CreateIntroContentRequest {
  categoryCode: string;
  locale: string;
  content: UpsertIntroContentRequest;
}

// ─── Content API Functions ───────────────────────────────────────

export async function getAdminCategories(): Promise<AdminCategoryItem[]> {
  return adminFetch<AdminCategoryItem[]>(`/admin/content/categories`);
}

export async function updateCategory(
  code: string,
  req: Partial<AdminCategoryItem>
): Promise<AdminCategoryItem> {
  return adminFetch<AdminCategoryItem>(`/admin/content/categories/${code}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export async function getAdminIntroContents(
  page = 0
): Promise<{ content: IntroContentResponse[]; totalElements: number; totalPages: number }> {
  return adminFetch<{ content: IntroContentResponse[]; totalElements: number; totalPages: number }>(
    `/admin/content/intro?page=${page}&size=20`
  );
}

export async function getAdminIntroContent(publicId: string): Promise<IntroContentResponse> {
  return adminFetch<IntroContentResponse>(`/admin/content/intro/${publicId}`);
}

export async function createIntroContent(
  req: CreateIntroContentRequest
): Promise<IntroContentResponse> {
  return adminFetch<IntroContentResponse>(`/admin/content/intro`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateIntroContent(
  publicId: string,
  req: UpsertIntroContentRequest
): Promise<IntroContentResponse> {
  return adminFetch<IntroContentResponse>(`/admin/content/intro/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function publishIntroContent(publicId: string): Promise<IntroContentResponse> {
  return adminFetch<IntroContentResponse>(`/admin/content/intro/${publicId}/publish`, {
    method: "POST",
  });
}

export async function unpublishIntroContent(publicId: string): Promise<IntroContentResponse> {
  return adminFetch<IntroContentResponse>(`/admin/content/intro/${publicId}/unpublish`, {
    method: "POST",
  });
}

export async function deleteIntroContent(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/content/intro/${publicId}`, {
    method: "DELETE",
  });
}

export async function getAdminFaqs(params?: {
  locale?: string;
  categoryCode?: string;
  page?: number;
}): Promise<{ content: FaqResponse[]; totalElements: number; totalPages: number }> {
  const p = new URLSearchParams();
  if (params?.locale) p.set("locale", params.locale);
  if (params?.categoryCode) p.set("categoryCode", params.categoryCode);
  if (params?.page !== undefined) p.set("page", String(params.page));
  p.set("size", "20");
  return adminFetch<{ content: FaqResponse[]; totalElements: number; totalPages: number }>(
    `/admin/content/faqs?${p.toString()}`
  );
}

export async function createFaq(req: {
  categoryCode?: string;
  locale: string;
  question: string;
  answer: string;
  sortOrder?: number;
}): Promise<FaqResponse> {
  return adminFetch<FaqResponse>(`/admin/content/faqs`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateFaq(
  publicId: string,
  req: { question: string; answer: string; sortOrder?: number }
): Promise<FaqResponse> {
  return adminFetch<FaqResponse>(`/admin/content/faqs/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function deleteFaq(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/content/faqs/${publicId}`, {
    method: "DELETE",
  });
}

export async function publishFaq(publicId: string): Promise<FaqResponse> {
  return adminFetch<FaqResponse>(`/admin/content/faqs/${publicId}/publish`, {
    method: "POST",
  });
}

// ─── Employers ───────────────────────────────────────────────

export interface AdminEmployerItem {
  publicId: string;
  phone: string;
  status: string;
  companyName: string | null;
  fullName: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminEmployerDetail extends AdminEmployerItem {
  email: string | null;
  adminNote: string | null;
}

export async function getAdminEmployers(params: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<PagedResponse<AdminEmployerItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  if (params.status) p.set("status", params.status);
  return adminFetch<PagedResponse<AdminEmployerItem>>(`/admin/employers?${p.toString()}`);
}

export async function getAdminEmployerDetail(publicId: string): Promise<AdminEmployerDetail> {
  return adminFetch<AdminEmployerDetail>(`/admin/employers/${publicId}`);
}

export async function patchEmployerStatus(publicId: string, status: string): Promise<AdminEmployerDetail> {
  return adminFetch<AdminEmployerDetail>(`/admin/employers/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteEmployer(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/employers/${publicId}`, { method: "DELETE" });
}

export async function restoreEmployer(publicId: string): Promise<AdminEmployerDetail> {
  return adminFetch<AdminEmployerDetail>(`/admin/employers/${publicId}/restore`, { method: "POST" });
}

// ─── Worker additions ─────────────────────────────────────────

export interface AdminWorkerDetail {
  publicId: string;
  phone: string;
  status: string;
  role: string;
  fullName: string;
  birthDate: string | null;
  nationality: string;
  visaType: string;
  healthCheckStatus: string;
  languages: { code: string; level: string }[];
  certifications: { code: string; name: string }[];
  desiredPayMin: number | null;
  desiredPayMax: number | null;
  desiredPayUnit: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  deletedAt: string | null;
  adminNote: string | null;
}

export async function getAdminWorkerDetail(publicId: string): Promise<AdminWorkerDetail> {
  return adminFetch<AdminWorkerDetail>(`/admin/workers/${publicId}`);
}

export async function patchWorkerStatus(publicId: string, status: string): Promise<AdminWorkerDetail> {
  return adminFetch<AdminWorkerDetail>(`/admin/workers/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteWorker(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/workers/${publicId}`, { method: "DELETE" });
}

export async function restoreWorker(publicId: string): Promise<AdminWorkerDetail> {
  return adminFetch<AdminWorkerDetail>(`/admin/workers/${publicId}/restore`, { method: "POST" });
}

// ─── Team additions ───────────────────────────────────────────

export interface AdminTeamDetail {
  publicId: string;
  name: string;
  teamType: "SQUAD" | "COMPANY_LINKED";
  leaderId: number;
  leaderName?: string;
  leaderPhone?: string;
  companyId?: number;
  companyName?: string;
  memberCount: number;
  status: "ACTIVE" | "INACTIVE" | "DISSOLVED";
  isNationwide: boolean;
  description?: string;
  coverImageUrl?: string;
  createdAt: string;
  deletedAt?: string | null;
  adminNote?: string | null;
  members?: { userId: number; fullName?: string; phone: string; role: string }[];
}

export async function getAdminTeamDetail(publicId: string): Promise<AdminTeamDetail> {
  return adminFetch<AdminTeamDetail>(`/admin/teams/${publicId}`);
}

export async function patchTeamStatus(publicId: string, status: string): Promise<AdminTeamDetail> {
  return adminFetch<AdminTeamDetail>(`/admin/teams/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteTeam(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/teams/${publicId}`, { method: "DELETE" });
}

export async function restoreTeam(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/teams/${publicId}/restore`, { method: "POST" });
}

// ─── Site additions ───────────────────────────────────────────

export async function deleteSite(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/sites/${publicId}`, { method: "DELETE" });
}

export async function restoreSite(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/sites/${publicId}/restore`, { method: "POST" });
}

// ─── Job additions ────────────────────────────────────────────

export async function deleteJob(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/jobs/${publicId}`, { method: "DELETE" });
}

export async function restoreJob(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/jobs/${publicId}/restore`, { method: "POST" });
}

// ─── Company additions ────────────────────────────────────────

export async function deleteCompany(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/companies/${publicId}`, { method: "DELETE" });
}

export async function restoreCompany(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/companies/${publicId}/restore`, { method: "POST" });
}

// ─── Contracts ────────────────────────────────────────────────

export interface AdminContractItem {
  publicId: string;
  status: string;
  workerUserId: number;
  employerUserId: number;
  jobId: number;
  startDate: string | null;
  endDate: string | null;
  payAmount: number | null;
  payUnit: string | null;
  createdAt: string;
}

export interface AdminContractDetail extends AdminContractItem {
  applicationId: number;
  terms: string | null;
  documentUrl: string | null;
  sentAt: string | null;
  employerSignedAt: string | null;
  workerSignedAt: string | null;
}

export async function getAdminContracts(params: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PagedResponse<AdminContractItem>> {
  const p = new URLSearchParams();
  if (params.status) p.set("status", params.status);
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return adminFetch<PagedResponse<AdminContractItem>>(`/admin/contracts?${p.toString()}`);
}

export async function getAdminContractDetail(publicId: string): Promise<AdminContractDetail> {
  return adminFetch<AdminContractDetail>(`/admin/contracts/${publicId}`);
}

export async function patchContractStatus(publicId: string, status: string): Promise<AdminContractDetail> {
  return adminFetch<AdminContractDetail>(`/admin/contracts/${publicId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteContract(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/contracts/${publicId}`, { method: "DELETE" });
}

// ─── Notifications ────────────────────────────────────────────

export interface AdminNotificationItem {
  publicId: string;
  userId: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export async function getAdminNotifications(params: {
  userId?: number;
  page?: number;
  size?: number;
}): Promise<PagedResponse<AdminNotificationItem>> {
  const p = new URLSearchParams();
  if (params.userId !== undefined) p.set("userId", String(params.userId));
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return adminFetch<PagedResponse<AdminNotificationItem>>(`/admin/notifications?${p.toString()}`);
}

export async function broadcastNotification(req: {
  userId?: number;
  type: string;
  title: string;
  body: string;
}): Promise<AdminNotificationItem> {
  return adminFetch<AdminNotificationItem>(`/admin/notifications/broadcast`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function deleteNotification(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/notifications/${publicId}`, { method: "DELETE" });
}

// ─── SMS Templates ────────────────────────────────────────────

export interface AdminSmsTemplateItem {
  publicId: string;
  code: string;
  name: string;
  locale: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getAdminSmsTemplates(params: {
  page?: number;
  size?: number;
  isActive?: boolean;
}): Promise<PagedResponse<AdminSmsTemplateItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  if (params.isActive !== undefined) p.set("isActive", String(params.isActive));
  return adminFetch<PagedResponse<AdminSmsTemplateItem>>(`/admin/sms-templates?${p.toString()}`);
}

export async function getAdminSmsTemplateDetail(publicId: string): Promise<AdminSmsTemplateItem> {
  return adminFetch<AdminSmsTemplateItem>(`/admin/sms-templates/${publicId}`);
}

export async function createSmsTemplate(req: {
  code: string;
  name: string;
  locale: string;
  content: string;
  variables: string[];
  isActive: boolean;
}): Promise<AdminSmsTemplateItem> {
  return adminFetch<AdminSmsTemplateItem>(`/admin/sms-templates`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateSmsTemplate(
  publicId: string,
  req: {
    code: string;
    name: string;
    locale: string;
    content: string;
    variables: string[];
    isActive: boolean;
  }
): Promise<AdminSmsTemplateItem> {
  return adminFetch<AdminSmsTemplateItem>(`/admin/sms-templates/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function deleteSmsTemplate(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/sms-templates/${publicId}`, { method: "DELETE" });
}

export async function restoreSmsTemplate(publicId: string): Promise<AdminSmsTemplateItem> {
  return adminFetch<AdminSmsTemplateItem>(`/admin/sms-templates/${publicId}/restore`, { method: "POST" });
}

// ─── Admin roles ──────────────────────────────────────────────

export async function getAdminUsers(params: {
  page?: number;
  size?: number;
}): Promise<PagedResponse<{ publicId: string; phone: string; status: string; adminRole: string | null; createdAt: string }>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return adminFetch<PagedResponse<{ publicId: string; phone: string; status: string; adminRole: string | null; createdAt: string }>>(
    `/admin/admins?${p.toString()}`
  );
}

export async function assignAdminRole(publicId: string, adminRole: string | null): Promise<void> {
  return adminFetch<void>(`/admin/admins/${publicId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ adminRole }),
  });
}

// ─── SMS Logs ─────────────────────────────────────────────────

export interface SmsLogItem {
  publicId: string;
  templateCode: string | null;
  toPhone: string;
  userId: number | null;
  content: string;
  status: "PENDING" | "SENDING" | "SENT" | "DELIVERED" | "FAILED" | "CANCELLED";
  locale: string;
  attemptCount: number;
  maxAttempts: number;
  provider: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  nextRetryAt: string | null;
  triggerEvent: string | null;
  createdAt: string;
}

export interface SmsLogListResponse {
  content: SmsLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function getSmsLogs(params: {
  status?: string;
  templateCode?: string;
  phone?: string;
  userId?: number;
  page?: number;
  size?: number;
}): Promise<SmsLogListResponse> {
  const p = new URLSearchParams();
  if (params.status) p.set("status", params.status);
  if (params.templateCode) p.set("templateCode", params.templateCode);
  if (params.phone) p.set("phone", params.phone);
  if (params.userId !== undefined) p.set("userId", String(params.userId));
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return adminFetch<SmsLogListResponse>(`/admin/sms/logs?${p.toString()}`);
}

export async function getSmsLogDetail(publicId: string): Promise<SmsLogItem> {
  return adminFetch<SmsLogItem>(`/admin/sms/logs/${publicId}`);
}

export async function retrySmsLog(publicId: string): Promise<SmsLogItem> {
  return adminFetch<SmsLogItem>(`/admin/sms/logs/${publicId}/retry`, {
    method: "POST",
  });
}

export async function adminSendSms(req: {
  toPhone: string;
  templateCode: string;
  locale?: string;
  variables?: Record<string, string>;
  scheduledAt?: string;
}): Promise<SmsLogItem> {
  return adminFetch<SmsLogItem>(`/admin/sms/send`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function adminBroadcastSms(req: {
  templateCode: string;
  locale?: string;
  variables?: Record<string, string>;
  filterRole?: string;
  filterStatus?: string;
  filterVisaType?: string;
  scheduledAt?: string;
}): Promise<{ count: number }> {
  return adminFetch<{ count: number }>(`/admin/sms/broadcast`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─── Admin CRUD — Companies ───────────────────────────────────────

export interface AdminUpsertCompanyPayload {
  name: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
  status?: string;
}

export async function createAdminCompany(payload: AdminUpsertCompanyPayload): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/companies`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCompany(publicId: string, payload: AdminUpsertCompanyPayload): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/companies/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Admin CRUD — Sites ───────────────────────────────────────────

export interface AdminUpsertSitePayload {
  companyPublicId: string;
  name: string;
  address: string;
  addressDetail?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export async function createAdminSite(payload: AdminUpsertSitePayload): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/sites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminSite(publicId: string, payload: Omit<AdminUpsertSitePayload, "companyPublicId"> & { companyPublicId: string }): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/sites/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Admin CRUD — Jobs ────────────────────────────────────────────

export interface AdminUpsertJobPayload {
  sitePublicId: string;
  title: string;
  description?: string;
  requiredCount?: number;
  applicationTypes?: string[];
  payMin?: number;
  payMax?: number;
  payUnit?: string;
  visaRequirements?: string[];
  certificationRequirements?: string[];
  healthCheckRequired?: boolean;
  alwaysOpen?: boolean;
  startDate?: string;
  endDate?: string;
  accommodationProvided?: boolean;
  mealProvided?: boolean;
  transportationProvided?: boolean;
  publish?: boolean;
}

export async function createAdminJob(payload: AdminUpsertJobPayload): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/jobs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminJob(publicId: string, payload: AdminUpsertJobPayload): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/jobs/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Admin CRUD — Contracts ───────────────────────────────────────

export interface AdminUpsertContractPayload {
  jobPublicId: string;
  workerPublicId: string;
  employerPublicId: string;
  applicationId?: number;
  startDate?: string;
  endDate?: string;
  payAmount?: number;
  payUnit?: string;
  terms?: string;
  documentUrl?: string;
}

export async function createAdminContract(payload: AdminUpsertContractPayload): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/contracts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminContract(publicId: string, payload: Partial<AdminUpsertContractPayload>): Promise<{ publicId: string }> {
  return adminFetch<{ publicId: string }>(`/admin/contracts/${publicId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminApplication(publicId: string): Promise<void> {
  return adminFetch<void>(`/admin/applications/${publicId}`, { method: "DELETE" });
}

// ─── Additional lookups ───────────────────────────────────────────

export async function getAdminSiteDetail(publicId: string): Promise<AdminSiteItem> {
  return adminFetch<AdminSiteItem>(`/admin/sites/${publicId}`);
}

export interface AdminSiteListItem extends AdminSiteItem {
  companyName?: string;
}
