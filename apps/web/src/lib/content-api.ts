import { api } from "./api";
import type { PagedJobsResponse } from "./jobs-api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryListItem {
  id: number;
  publicId: string;
  code: string;
  nameKo: string;
  nameEn: string | null;
  nameVi: string | null;
  description: string | null;
  iconUrl: string | null;
  hasContent: boolean;
}

export interface ContentSection {
  title: string;
  description: string;
}

export interface SkillEntry {
  name: string;
  level: string; // 필수 | 권장 | 선택 | 고급
}

export interface PricingNote {
  type: string; // DAILY | HOURLY | MONTHLY
  minAmount: number;
  maxAmount: number;
  note: string | null;
}

export interface FaqItem {
  publicId: string;
  question: string;
  answer: string;
  sortOrder: number;
  locale: string;
  isPublished: boolean;
}

export interface IntroContent {
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

export interface CategoryDetailResponse {
  publicId: string;
  code: string;
  nameKo: string;
  nameEn: string | null;
  nameVi: string | null;
  iconUrl: string | null;
  content: IntroContent | null;
  faqs: FaqItem[];
  locale: string;
}

// Re-export for convenience
export type { PagedJobsResponse as JobListResponse };

// ─── API calls ────────────────────────────────────────────────────────────────

export function getCategories(locale = "ko"): Promise<CategoryListItem[]> {
  return api.get<CategoryListItem[]>(`/categories?locale=${locale}`);
}

export function getCategoryDetail(
  code: string,
  locale = "ko"
): Promise<CategoryDetailResponse> {
  return api.get<CategoryDetailResponse>(
    `/categories/${encodeURIComponent(code)}?locale=${locale}`
  );
}

export function getCategoryJobs(
  code: string,
  page = 0
): Promise<PagedJobsResponse> {
  return api.get<PagedJobsResponse>(
    `/categories/${encodeURIComponent(code)}/jobs?page=${page}&size=10`
  );
}
