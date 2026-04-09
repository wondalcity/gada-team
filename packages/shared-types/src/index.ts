// ─────────────────────────────────────────────────────────────
// GADA Shared Types — consumed by both web (Next.js) and any
// future React Native app. Keep this import-free (no runtime
// deps); type-only declarations only.
// ─────────────────────────────────────────────────────────────

// ── Enums ──────────────────────────────────────────────────

export type UserRole = "WORKER" | "TEAM_LEADER" | "EMPLOYER" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type VisaType =
  | "CITIZEN"
  | "F4"
  | "F5"
  | "F6"
  | "H2"
  | "E9"
  | "E7"
  | "D8"
  | "OTHER";

export type HealthCheckStatus =
  | "NOT_DONE"
  | "SCHEDULED"
  | "COMPLETED"
  | "EXPIRED";

export type PayUnit = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "LUMP_SUM";

export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "PAUSED"
  | "CLOSED"
  | "ARCHIVED";

export type ApplicationType = "INDIVIDUAL" | "TEAM" | "COMPANY";

export type ApplicationStatus =
  | "PENDING"
  | "REVIEWING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CANCELLED";

export type TeamType = "SQUAD" | "COMPANY_LINKED";
export type TeamStatus = "ACTIVE" | "INACTIVE" | "DISSOLVED";
export type TeamMemberRole = "LEADER" | "MEMBER";

export type CompanyStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";
export type SiteStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "SUSPENDED";
export type EmployerRole = "OWNER" | "MANAGER" | "STAFF";

// ── API Response wrapper ────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ── Domain types ────────────────────────────────────────────

export interface Region {
  id: number;
  sido: string;
  sigungu: string;
  dong?: string;
  code?: string;
}

export interface JobCategory {
  id: number;
  publicId: string;
  code: string;
  nameKo: string;
  nameEn?: string;
  nameVi?: string;
  descriptionKo?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Company {
  id: number;
  publicId: string;
  name: string;
  logoUrl?: string;
  description?: string;
  status: CompanyStatus;
  verifiedAt?: string;
}

export interface Site {
  id: number;
  publicId: string;
  companyId: number;
  company?: Pick<Company, "id" | "publicId" | "name" | "logoUrl">;
  name: string;
  address: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  region?: Region;
  status: SiteStatus;
  startDate?: string;
  endDate?: string;
}

export interface Job {
  id: number;
  publicId: string;
  siteId: number;
  site?: Pick<Site, "id" | "publicId" | "name" | "address" | "latitude" | "longitude">;
  companyId: number;
  company?: Pick<Company, "id" | "publicId" | "name" | "logoUrl">;
  jobCategoryId?: number;
  jobCategory?: Pick<JobCategory, "id" | "code" | "nameKo" | "iconUrl">;
  title: string;
  description?: string;
  requiredCount?: number;
  applicationTypes: ApplicationType[];
  payMin?: number;
  payMax?: number;
  payUnit: PayUnit;
  visaRequirements: VisaType[];
  certificationRequirements: string[];
  healthCheckRequired: boolean;
  alwaysOpen: boolean;
  startDate?: string;
  endDate?: string;
  status: JobStatus;
  viewCount: number;
  applicationCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerProfile {
  id: number;
  publicId: string;
  userId: number;
  fullName: string;
  birthDate: string;
  profileImageUrl?: string;
  nationality: string;
  visaType: VisaType;
  languages: string[];
  desiredJobCategories: string[];
  equipment: string[];
  certifications: Certification[];
  healthCheckStatus: HealthCheckStatus;
  healthCheckExpiry?: string;
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: PayUnit;
  portfolio: PortfolioItem[];
  bio?: string;
  isPublic: boolean;
}

export interface Certification {
  name: string;
  issuedBy?: string;
  issuedAt?: string;
  expiresAt?: string;
  imageUrl?: string;
}

export interface PortfolioItem {
  title: string;
  description?: string;
  imageUrls?: string[];
  startDate?: string;
  endDate?: string;
}

export interface Team {
  id: number;
  publicId: string;
  name: string;
  leaderId: number;
  teamType: TeamType;
  companyId?: number;
  introShort?: string;
  introLong?: string;
  introMultilingual: Record<string, string>;
  isNationwide: boolean;
  regions: Pick<Region, "sido" | "sigungu">[];
  equipment: string[];
  portfolio: PortfolioItem[];
  memberCount: number;
  status: TeamStatus;
}

export interface Application {
  id: number;
  publicId: string;
  jobId: number;
  job?: Pick<Job, "id" | "publicId" | "title">;
  applicationType: ApplicationType;
  applicantUserId?: number;
  teamId?: number;
  companyId?: number;
  status: ApplicationStatus;
  coverLetter?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notification ────────────────────────────────────────────

export type NotificationType =
  | "APPLICATION"
  | "SCOUT"
  | "STATUS_CHANGE"
  | "SYSTEM"
  | "MARKETING";

export interface Notification {
  id: number;
  publicId: string;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ── Scout ───────────────────────────────────────────────────

export type ScoutResponse = "ACCEPTED" | "DECLINED";

export interface Scout {
  id: number;
  publicId: string;
  jobId: number;
  job?: Pick<Job, "id" | "publicId" | "title">;
  senderUserId: number;
  targetUserId?: number;
  targetTeamId?: number;
  message: string;
  isRead: boolean;
  readAt?: string;
  response?: ScoutResponse;
  respondedAt?: string;
  createdAt: string;
}

// ── User ────────────────────────────────────────────────────

export interface User {
  id: number;
  publicId: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

// ── Employer profile ─────────────────────────────────────────

export interface EmployerProfile {
  id: number;
  publicId: string;
  userId: number;
  companyId?: number;
  company?: Pick<Company, "id" | "publicId" | "name" | "logoUrl">;
  fullName: string;
  position?: string;
  role: EmployerRole;
}

// ── Auth / session ───────────────────────────────────────────

export interface AuthSession {
  user: User;
  workerProfile?: WorkerProfile;
  employerProfile?: EmployerProfile;
  accessToken: string;
}

// ── Request bodies ───────────────────────────────────────────

export interface CreateJobRequest {
  siteId: number;
  jobCategoryId?: number;
  title: string;
  description?: string;
  requiredCount?: number;
  applicationTypes: ApplicationType[];
  payMin?: number;
  payMax?: number;
  payUnit: PayUnit;
  visaRequirements?: string[];
  certificationRequirements?: string[];
  healthCheckRequired?: boolean;
  alwaysOpen?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface UpdateApplicationStatusRequest {
  status: ApplicationStatus;
  note?: string;
}

// ── Search / filter params ──────────────────────────────────

export interface JobSearchParams {
  keyword?: string;
  sido?: string;
  sigungu?: string;
  categoryCode?: string;
  payMin?: number;
  payMax?: number;
  payUnit?: PayUnit;
  applicationType?: ApplicationType;
  visaType?: VisaType;
  healthCheckRequired?: boolean;
  certificationRequired?: string;
  lat?: number;
  lng?: number;
  radiusKm?: 3 | 5 | 10 | 25 | 50;
  page?: number;
  size?: number;
  sort?: "latest" | "pay" | "distance";
}

// ── Company DTO (API response shape) ─────────────────────
export interface CompanyDto {
  id: number;
  name: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
  status: CompanyStatus;
  isVerified: boolean;
  siteCount: number;
  activeJobCount: number;
  createdAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  businessRegistrationNumber?: string;
  ceoName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
}

// ── Site DTO ──────────────────────────────────────────────
export interface SiteDto {
  id: number;
  companyId: number;
  companyName: string;
  name: string;
  address: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: SiteStatus;
  sido?: string;
  sigungu?: string;
  activeJobCount: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface CreateSiteRequest {
  name: string;
  address: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  regionId?: number;
  startDate?: string;
  endDate?: string;
}

// ── JobCategory DTO ────────────────────────────────────────
export interface JobCategoryDto {
  id: number;
  code: string;
  nameKo: string;
  nameVi?: string;
  parentId?: number;
  jobCount: number;
}

// ── Job list item (for cards) ──────────────────────────────
export interface JobSummary {
  id: number;
  publicId: string;
  title: string;
  companyId: number;
  companyName: string;
  companyLogoUrl?: string;
  siteId: number;
  siteName: string;
  sido?: string;
  sigungu?: string;
  categoryId?: number;
  categoryName?: string;
  payMin?: number;
  payMax?: number;
  payUnit: PayUnit;
  requiredCount?: number;
  applicationTypes: ApplicationType[];
  status: JobStatus;
  alwaysOpen: boolean;
  startDate?: string;
  endDate?: string;
  viewCount: number;
  applicationCount: number;
  publishedAt?: string;
  createdAt: string;
}

// ── Job detail (full) ──────────────────────────────────────
export interface JobDetail extends JobSummary {
  description?: string;
  visaRequirements: string[];
  certificationRequirements: string[];
  healthCheckRequired: boolean;
  site: SiteDto;
}

// ── Employer job management ─────────────────────────────────
export interface UpdateJobRequest {
  title?: string;
  description?: string;
  requiredCount?: number;
  applicationTypes?: ApplicationType[];
  payMin?: number;
  payMax?: number;
  payUnit?: PayUnit;
  visaRequirements?: string[];
  certificationRequirements?: string[];
  healthCheckRequired?: boolean;
  alwaysOpen?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PatchJobStatusRequest {
  status: JobStatus;
}

// ── Admin types ────────────────────────────────────────────
export interface AdminJobRow extends JobSummary {
  employerName: string;
}

export interface AdminCompanyRow extends CompanyDto {
  ownerPhone?: string;
}
