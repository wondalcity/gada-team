import { api } from "./api";
import { isMockMode, mockEmployerApi } from "./employer-mock";

// ─── Types ───────────────────────────────────────────────────────

export interface CompanyResponse {
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
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";
  isVerified: boolean;
  siteCount: number;
  activeJobCount: number;
  createdAt: string;
}

export interface SiteResponse {
  publicId: string;
  companyPublicId?: string;
  companyName: string;
  name: string;
  address?: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "SUSPENDED";
  sido?: string;
  sigungu?: string;
  activeJobCount: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface JobSummary {
  publicId: string;
  title: string;
  companyName: string;
  sitePublicId: string;
  siteName: string;
  sido?: string;
  sigungu?: string;
  categoryId?: number;
  categoryName?: string;
  payMin?: number;
  payMax?: number;
  payUnit: string;
  requiredCount: number;
  applicationTypes: string[];
  accommodationProvided: boolean;
  mealProvided: boolean;
  transportationProvided: boolean;
  status: string;
  alwaysOpen: boolean;
  startDate?: string;
  endDate?: string;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
}

export interface JobDetail extends JobSummary {
  description?: string;
  visaRequirements: string[];
  certificationRequirements: string[];
  healthCheckRequired: boolean;
}

export interface CategoryItem {
  id: number;
  code: string;
  nameKo: string;
  nameVi?: string;
  parentId?: number;
}

export interface CreateCompanyPayload {
  name: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
}

export interface CreateSitePayload {
  name: string;
  address: string;
  addressDetail?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSitePayload {
  name?: string;
  address?: string;
  addressDetail?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateJobPayload {
  sitePublicId: string;
  title: string;
  description?: string;
  jobCategoryId?: number;
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
}

export interface JobListResponse {
  content: JobSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ─── Application types (employer side) ───────────────────────────

export type ApplicationStatus =
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW_PENDING"
  | "ON_HOLD"
  | "REJECTED"
  | "HIRED"
  | "WITHDRAWN";

export interface WorkerSnapshot {
  fullName: string;
  birthDate?: string;
  nationality?: string;
  visaType?: string;
  healthCheckStatus?: string;
  profileImageUrl?: string;
  languages?: { code: string; level: string }[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
  /** Only populated by the API when application status is HIRED */
  phone?: string;
}

export interface TeamSnapshot {
  name: string;
  type?: string;
  description?: string;
  memberCount?: number;
}

export interface ApplicationSummary {
  publicId: string;
  jobTitle: string;
  jobPublicId: string;
  companyName: string;
  applicationType: string;
  status: ApplicationStatus;
  statusUpdatedAt: string;
  isScouted: boolean;
  isVerified: boolean;
  appliedAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  coverLetter?: string;
  employerNote?: string;
  workerSnapshot: WorkerSnapshot;
  teamSnapshot?: TeamSnapshot;
  statusHistory: {
    fromStatus?: string;
    toStatus: string;
    note?: string;
    createdAt: string;
  }[];
}

export interface ApplicationListResponse {
  content: ApplicationSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── Points & Proposal types ──────────────────────────────────────

export interface PointBalanceData {
  balance: number;
  totalCharged: number;
  totalUsed: number;
  updatedAt: string;
}

export interface PointChargeItem {
  publicId: string;
  amountKrw: number;
  pointsToAdd: number;
  paymentMethod: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface TeamProposalData {
  publicId: string;
  teamPublicId: string;
  jobPublicId: string;
  jobTitle?: string;
  message?: string;
  pointsUsed: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  respondedAt?: string;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ─── API functions ────────────────────────────────────────────────

export const employerApi = {
  // Company
  createCompany: (payload: CreateCompanyPayload) =>
    isMockMode()
      ? mockEmployerApi.createCompany(payload)
      : api.post<CompanyResponse>("/companies", payload),
  getMyCompany: () =>
    isMockMode()
      ? mockEmployerApi.getMyCompany()
      : api.get<CompanyResponse>("/companies/mine"),
  updateMyCompany: (publicId: string, payload: UpdateCompanyPayload) =>
    isMockMode()
      ? mockEmployerApi.updateMyCompany(publicId, payload)
      : api.put<CompanyResponse>(`/companies/${publicId}`, payload),

  // Sites
  createSite: (companyPublicId: string, payload: CreateSitePayload) =>
    isMockMode()
      ? mockEmployerApi.createSite(companyPublicId, payload)
      : api.post<SiteResponse>(`/companies/${companyPublicId}/sites`, payload),
  getMySites: (companyPublicId: string) =>
    isMockMode()
      ? mockEmployerApi.getMySites(companyPublicId)
      : api.get<SiteResponse[]>(`/companies/${companyPublicId}/sites`),
  getSite: (companyPublicId: string, sitePublicId: string) =>
    isMockMode()
      ? mockEmployerApi.getSite(companyPublicId, sitePublicId)
      : api.get<SiteResponse>(`/companies/${companyPublicId}/sites/${sitePublicId}`),
  updateSite: (companyPublicId: string, sitePublicId: string, payload: UpdateSitePayload) =>
    isMockMode()
      ? mockEmployerApi.updateSite(companyPublicId, sitePublicId, payload)
      : api.put<SiteResponse>(`/companies/${companyPublicId}/sites/${sitePublicId}`, payload),
  deleteSite: (companyPublicId: string, sitePublicId: string) =>
    isMockMode()
      ? mockEmployerApi.deleteSite(companyPublicId, sitePublicId)
      : api.delete<void>(`/companies/${companyPublicId}/sites/${sitePublicId}`),

  // Jobs
  createJob: (payload: CreateJobPayload) =>
    isMockMode()
      ? mockEmployerApi.createJob(payload)
      : api.post<JobDetail>("/jobs", payload),
  updateJob: (publicId: string, payload: Partial<CreateJobPayload>) =>
    isMockMode()
      ? mockEmployerApi.updateJob(publicId, payload)
      : api.put<JobDetail>(`/jobs/${publicId}`, payload),
  patchJobStatus: (publicId: string, status: string) =>
    isMockMode()
      ? mockEmployerApi.patchJobStatus(publicId, status)
      : api.patch<JobDetail>(`/jobs/${publicId}/status`, { status }),
  deleteJob: (publicId: string) =>
    isMockMode()
      ? mockEmployerApi.deleteJob(publicId)
      : api.delete<void>(`/jobs/${publicId}`),
  getMyJobs: (page = 0, size = 20) =>
    isMockMode()
      ? mockEmployerApi.getMyJobs(page, size)
      : api.get<JobListResponse>(`/jobs/mine?page=${page}&size=${size}`),
  getJobDetail: (publicId: string) =>
    isMockMode()
      ? mockEmployerApi.getJobDetail(publicId)
      : api.get<JobDetail>(`/jobs/${publicId}`),

  // Categories
  getCategories: () =>
    isMockMode()
      ? mockEmployerApi.getCategories()
      : api.get<CategoryItem[]>("/categories"),

  // Applicant management
  getJobApplications: (jobPublicId: string, status?: string, page = 0, size = 20) =>
    isMockMode()
      ? mockEmployerApi.getJobApplications(jobPublicId, status, page, size)
      : api.get<ApplicationListResponse>(
          `/employer/jobs/${jobPublicId}/applications?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
        ),
  getApplicationDetail: (appPublicId: string) =>
    isMockMode()
      ? mockEmployerApi.getApplicationDetail(appPublicId)
      : api.get<ApplicationDetail>(`/employer/applications/${appPublicId}`),
  updateApplicationStatus: (appPublicId: string, status: string, note?: string) =>
    isMockMode()
      ? mockEmployerApi.updateApplicationStatus(appPublicId, status, note)
      : api.patch<ApplicationDetail>(`/employer/applications/${appPublicId}/status`, { status, note }),
  scoutApplicant: (appPublicId: string) =>
    isMockMode()
      ? mockEmployerApi.scoutApplicant(appPublicId)
      : api.post<ApplicationDetail>(`/employer/applications/${appPublicId}/scout`, {}),

  // Points
  getPointBalance: () => api.get<PointBalanceData>("/employer/points"),
  listChargeRequests: (page = 0, size = 20) =>
    api.get<PagedResponse<PointChargeItem>>(`/employer/points/charges?page=${page}&size=${size}`),
  requestCharge: (amountKrw: number, paymentMethod: "CASH" | "CARD") =>
    api.post<PointChargeItem>("/employer/points/charges", { amountKrw, paymentMethod }),
  confirmCardPayment: (paymentKey: string, orderId: string, amountKrw: number) =>
    api.post<PointChargeItem>("/employer/points/charges/card-confirm", { paymentKey, orderId, amountKrw }),

  // Team proposals
  sendProposal: (teamPublicId: string, jobPublicId: string, jobTitle?: string, message?: string) =>
    api.post<TeamProposalData>("/employer/teams/proposals", { teamPublicId, jobPublicId, jobTitle, message }),
  listProposals: (page = 0, size = 20) =>
    api.get<PagedResponse<TeamProposalData>>(`/employer/teams/proposals?page=${page}&size=${size}`),

  // Commissions & Subsidies
  getMyCommissions: (page = 0, size = 20) =>
    api.get<PagedResponse<EmployerCommissionItem>>(`/employer/commissions?page=${page}&size=${size}`),
  getMySubsidies: (page = 0, size = 20) =>
    api.get<PagedResponse<EmployerSubsidyItem>>(`/employer/commissions/subsidies?page=${page}&size=${size}`),
};

// ─── Commission / Subsidy types ────────────────────────────────

export interface EmployerCommissionItem {
  publicId: string;
  jobTitle?: string;
  workerName?: string;
  amountKrw: number;
  ratePct?: number;
  status: "PENDING" | "PAID" | "WAIVED";
  dueDate?: string;
  createdAt: string;
}

export interface EmployerSubsidyItem {
  publicId: string;
  subsidyType: "GOVERNMENT" | "PLATFORM";
  title: string;
  description?: string;
  amountKrw: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISBURSED";
  disbursedAt?: string;
  createdAt: string;
}
