import { api } from "./api";

export interface WorkerLanguageEntry {
  code: string;
  level: string;
}

export interface WorkerCertificationEntry {
  code: string;
  name: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface WorkerPortfolioEntry {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  imageUrls: string[];
}

export interface WorkerPublicProfile {
  publicId: string;
  fullName: string;
  nationality: string;
  visaType: string;
  healthCheckStatus: string;
  profileImageUrl: string | null;
  languages: WorkerLanguageEntry[];
  certifications: WorkerCertificationEntry[];
  equipment: string[];
  portfolio: WorkerPortfolioEntry[];
  desiredPayMin: number | null;
  desiredPayMax: number | null;
  desiredPayUnit: string | null;
  desiredJobCategories: number[];
  bio: string | null;
  isTeamLeader: boolean;
  teamPublicId: string | null;
  teamName: string | null;
}

export interface WorkerListItem {
  publicId: string;
  fullName: string;
  nationality: string;
  visaType: string;
  healthCheckStatus: string;
  profileImageUrl: string | null;
  desiredPayMin: number | null;
  desiredPayMax: number | null;
  desiredPayUnit: string | null;
  isTeamLeader: boolean;
  teamPublicId: string | null;
  teamName: string | null;
}

export interface WorkerListResponse {
  content: WorkerListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface WorkersFilter {
  keyword?: string;
  nationality?: string;
  visaType?: string;
  page: number;
  size: number;
}

export function getWorkers(filter: WorkersFilter): Promise<WorkerListResponse> {
  const params = new URLSearchParams();
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.nationality) params.set("nationality", filter.nationality);
  if (filter.visaType) params.set("visaType", filter.visaType);
  params.set("page", String(filter.page));
  params.set("size", String(filter.size));
  return api.get<WorkerListResponse>(`/workers?${params.toString()}`);
}

export function getWorker(publicId: string): Promise<WorkerPublicProfile> {
  return api.get<WorkerPublicProfile>(`/workers/${publicId}`);
}
