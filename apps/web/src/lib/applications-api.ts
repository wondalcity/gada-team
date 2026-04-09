import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

export interface ApplicationListResponse {
  content: ApplicationSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Full snapshot returned after applying */
export interface ApplicationDetail {
  publicId: string;
  jobPublicId: string;
  jobTitle: string;
  companyName: string;
  applicationType: ApplicationType;
  teamPublicId?: string;
  teamName?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  statusUpdatedAt: string;
  isScouted: boolean;
  isVerified: boolean;
  appliedAt: string;
}

export interface ApplyPayload {
  applicationType: ApplicationType;
  teamPublicId?: string;
  coverLetter?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function applyForJob(
  jobPublicId: string,
  payload: ApplyPayload
): Promise<ApplicationDetail> {
  return api.post<ApplicationDetail>(`/jobs/${jobPublicId}/apply`, payload);
}

export function getMyApplications(
  page = 0
): Promise<ApplicationListResponse> {
  return api.get<ApplicationListResponse>(
    `/applications/mine?page=${page}&size=20`
  );
}

export function withdrawApplication(publicId: string): Promise<void> {
  return api.delete<void>(`/applications/${publicId}`);
}
