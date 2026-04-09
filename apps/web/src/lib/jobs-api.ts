import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobSummary {
  publicId: string; // UUID — use this in /jobs/:publicId URLs
  sitePublicId: string;
  companyPublicId: string;
  companyName: string;
  companyLogoUrl?: string;
  siteName: string;
  sido?: string;
  sigungu?: string;
  categoryName?: string;
  categoryCode?: string;
  categoryHasContent?: boolean;
  title: string;
  description?: string;
  payMin?: number;
  payMax?: number;
  payUnit: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "LUMP_SUM";
  applicationTypes: string[];
  accommodationProvided: boolean;
  mealProvided: boolean;
  transportationProvided: boolean;
  requiredCount?: number;
  alwaysOpen: boolean;
  startDate?: string;
  endDate?: string;
  status: string;
  viewCount: number;
  applicationCount: number;
  publishedAt?: string;
  createdAt: string;
  // Location search fields
  siteLat?: number;
  siteLng?: number;
  distanceKm?: number;
}

export interface SiteInfo {
  publicId: string;
  name: string;
  address: string;
  addressDetail?: string;
  latitude?: number;
  longitude?: number;
  sido?: string;
  sigungu?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  companyName?: string;
  companyPublicId?: string;
  companyLogoUrl?: string;
  companyBusinessNumber?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  companyDescription?: string;
}

export interface JobDetail extends JobSummary {
  visaRequirements: string[];
  certificationRequirements: string[];
  healthCheckRequired: boolean;
  site: SiteInfo;
}

export interface CategoryItem {
  id: number;          // Long on backend
  publicId: string;    // UUID
  code: string;
  nameKo: string;
  nameVi?: string;
  nameEn?: string;
}

export interface JobsFilter {
  keyword?: string;
  sido?: string;
  sigungu?: string;
  categoryId?: number;          // backend uses Long
  payUnit?: string;
  payMin?: number;
  payMax?: number;
  applicationType?: string;     // INDIVIDUAL | TEAM | COMPANY
  visaType?: string;            // CITIZEN | H2 | E9 | E7 | F4 | F5 | F6 | OTHER
  nationality?: string;         // KR | VN | CN | PH | ID | OTHER
  healthCheckRequired?: boolean;
  certification?: string;
  equipment?: string;
  accommodationProvided?: boolean;
  mealProvided?: boolean;
  transportationProvided?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;              // 3 | 5 | 10 | 25 | 50
  page: number;
  size: number;
  sort?: string;
}

export interface PagedJobsResponse {
  content: JobSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(filter: JobsFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.sido) params.set("sido", filter.sido);
  if (filter.sigungu) params.set("sigungu", filter.sigungu);
  if (filter.categoryId) params.set("categoryId", String(filter.categoryId));
  if (filter.payUnit) params.set("payUnit", filter.payUnit);
  if (filter.payMin != null) params.set("payMin", String(filter.payMin));
  if (filter.payMax != null) params.set("payMax", String(filter.payMax));
  if (filter.applicationType) params.set("applicationType", filter.applicationType);
  if (filter.visaType) params.set("visaType", filter.visaType);
  if (filter.nationality) params.set("nationality", filter.nationality);
  if (filter.healthCheckRequired) params.set("healthCheckRequired", "true");
  if (filter.certification) params.set("certification", filter.certification);
  if (filter.equipment) params.set("equipment", filter.equipment);
  if (filter.accommodationProvided != null)
    params.set("accommodationProvided", String(filter.accommodationProvided));
  if (filter.mealProvided != null)
    params.set("mealProvided", String(filter.mealProvided));
  if (filter.transportationProvided != null)
    params.set("transportationProvided", String(filter.transportationProvided));
  if (filter.lat != null) params.set("lat", String(filter.lat));
  if (filter.lng != null) params.set("lng", String(filter.lng));
  if (filter.radius != null) params.set("radius", String(filter.radius));
  params.set("page", String(filter.page));
  params.set("size", String(filter.size));
  if (filter.sort) params.set("sort", filter.sort);
  return params;
}

/** Parse URL search params back into a JobsFilter */
export function filterFromParams(params: URLSearchParams): JobsFilter {
  const categoryIdRaw = params.get("categoryId");
  const payMinRaw = params.get("payMin");
  const payMaxRaw = params.get("payMax");
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  const radiusRaw = params.get("radius");

  return {
    keyword: params.get("keyword") ?? undefined,
    sido: params.get("sido") ?? undefined,
    sigungu: params.get("sigungu") ?? undefined,
    categoryId: categoryIdRaw ? Number(categoryIdRaw) : undefined,
    payUnit: params.get("payUnit") ?? undefined,
    payMin: payMinRaw ? Number(payMinRaw) : undefined,
    payMax: payMaxRaw ? Number(payMaxRaw) : undefined,
    applicationType: params.get("applicationType") ?? undefined,
    visaType: params.get("visaType") ?? undefined,
    nationality: params.get("nationality") ?? undefined,
    healthCheckRequired: params.get("healthCheckRequired") === "true" ? true : undefined,
    certification: params.get("certification") ?? undefined,
    equipment: params.get("equipment") ?? undefined,
    accommodationProvided: params.get("accommodationProvided") === "true" ? true : undefined,
    mealProvided: params.get("mealProvided") === "true" ? true : undefined,
    transportationProvided: params.get("transportationProvided") === "true" ? true : undefined,
    lat: latRaw ? Number(latRaw) : undefined,
    lng: lngRaw ? Number(lngRaw) : undefined,
    radius: radiusRaw ? Number(radiusRaw) : undefined,
    page: 0,
    size: 12,
  };
}

/** Serialise a filter into URL search params (omits pagination) */
export function filterToSearchParams(filter: JobsFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (filter.keyword) p.set("keyword", filter.keyword);
  if (filter.sido) p.set("sido", filter.sido);
  if (filter.sigungu) p.set("sigungu", filter.sigungu);
  if (filter.categoryId) p.set("categoryId", String(filter.categoryId));
  if (filter.payUnit) p.set("payUnit", filter.payUnit);
  if (filter.payMin != null) p.set("payMin", String(filter.payMin));
  if (filter.payMax != null) p.set("payMax", String(filter.payMax));
  if (filter.applicationType) p.set("applicationType", filter.applicationType);
  if (filter.visaType) p.set("visaType", filter.visaType);
  if (filter.nationality) p.set("nationality", filter.nationality);
  if (filter.healthCheckRequired) p.set("healthCheckRequired", "true");
  if (filter.certification) p.set("certification", filter.certification);
  if (filter.equipment) p.set("equipment", filter.equipment);
  if (filter.accommodationProvided) p.set("accommodationProvided", "true");
  if (filter.mealProvided) p.set("mealProvided", "true");
  if (filter.transportationProvided) p.set("transportationProvided", "true");
  if (filter.lat != null) p.set("lat", String(filter.lat));
  if (filter.lng != null) p.set("lng", String(filter.lng));
  if (filter.radius != null) p.set("radius", String(filter.radius));
  return p;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function getJobs(filter: JobsFilter): Promise<PagedJobsResponse> {
  const qs = buildQuery(filter).toString();
  return api.get<PagedJobsResponse>(`/jobs${qs ? `?${qs}` : ""}`);
}

export function getJobDetail(publicId: string): Promise<JobDetail> {
  return api.get<JobDetail>(`/jobs/${publicId}`);
}

export function getCategories(): Promise<CategoryItem[]> {
  return api.get<CategoryItem[]>("/categories?locale=ko");
}
