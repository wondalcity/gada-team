import { auth } from "./firebase";
import { useAuthStore } from "@/store/authStore";

// Always use relative URLs so requests go through Next.js rewrites.
// The rewrite proxies /api/* → Spring Boot API (resolvable server-side in Docker).
const BASE_URL = "";

/** Returns the best available token: our JWT (password auth) > dev bypass > Firebase OTP */
async function getBearerToken(): Promise<{ type: "bearer" | "dev"; value: string } | null> {
  // 1. Our own JWT (password-based auth) — highest priority
  const storedToken = useAuthStore.getState().token;
  if (storedToken) return { type: "bearer", value: storedToken };

  // 2. Dev quick-login (X-Dev-User-Id) — must come before Firebase so a stale Firebase
  //    session never shadows the dev bypass (backend would reject the Firebase token with 401
  //    when Firebase Admin SDK isn't configured in the dev environment).
  if (typeof window !== "undefined") {
    const devId = localStorage.getItem("gada_dev_user_id");
    if (devId) return { type: "dev", value: devId };
  }

  // 3. Firebase OTP session (only reached when no JWT and no dev bypass)
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    const fbToken = await firebaseUser.getIdToken().catch(() => null);
    if (fbToken) return { type: "bearer", value: fbToken };
  }

  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authInfo = await getBearerToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (authInfo?.type === "bearer") {
    headers["Authorization"] = `Bearer ${authInfo.value}`;
  } else if (authInfo?.type === "dev") {
    headers["X-Dev-User-Id"] = authInfo.value;
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    headers,
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    const err = new Error(
      res.status === 403 && text.includes("CORS")
        ? "API 서버 CORS 오류 — 서버가 실행 중인지 확인하세요"
        : res.status === 401
        ? "로그인이 필요합니다"
        : `서버 오류 (${res.status})`
    );
    (err as any).status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(json.message || "Request failed");
    (err as any).status = res.status;
    (err as any).errorCode = json.errorCode;
    throw err;
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ─── Auth API ────────────────────────────────────────────────────────────────

export interface AuthResponse {
  userId: number;
  phone: string;
  fullName?: string | null;
  role: "WORKER" | "TEAM_LEADER" | "EMPLOYER" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  isNewUser: boolean;
  /** JWT returned on password-based auth */
  token?: string | null;
}

/** Firebase OTP 기반 로그인 (레거시) */
export async function loginWithToken(idToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", { idToken });
}

/** 이름 + 전화번호 + OTP 인증 + 비밀번호로 회원가입 */
export async function registerWithPassword(payload: {
  name: string;
  phone: string;
  firebaseOtpToken?: string;
  password: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", payload);
}

/** 전화번호 + 비밀번호로 로그인 */
export async function loginWithPassword(payload: {
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login/password", payload);
}

export async function onboard(payload: {
  idToken?: string;
  role: string;
  fullName: string;
  birthDate?: string;
  nationality?: string;
  visaType?: string;
  languages?: { code: string; level: string }[];
  desiredJobCategories?: number[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/onboard", payload);
}

// ─── Worker Profile ───────────────────────────────────────────────────────────

export interface WorkerProfile {
  publicId: string;
  userId: number;
  phone: string;
  role: "WORKER" | "TEAM_LEADER";
  status: string;
  fullName?: string;
  birthDate?: string;
  nationality?: string;
  visaType?: string;
  healthCheckStatus?: string;
  profileImageUrl?: string;
  languages: { code: string; level: string }[];
  certifications: { code: string; name: string; issueDate?: string }[];
  equipment: string[];
  portfolio: {
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    imageUrls: string[];
  }[];
  desiredPayMin?: number;
  desiredPayMax?: number;
  desiredPayUnit?: string;
  desiredJobCategories?: number[];
  teamPublicId?: string;
  teamName?: string;
  createdAt: string;
}

export async function getMyWorkerProfile(): Promise<WorkerProfile> {
  return api.get<WorkerProfile>("/workers/me");
}

export async function updateMyWorkerProfile(payload: Partial<Omit<WorkerProfile, "publicId" | "userId" | "phone" | "role" | "status" | "createdAt">>): Promise<WorkerProfile> {
  return api.patch<WorkerProfile>("/workers/me", payload);
}

export function getAdminUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gada_admin_user_id");
}

// ─── Job Bookmarks ────────────────────────────────────────────────────────────

export interface JobBookmarkItem {
  bookmarkId: number;
  publicId: string;
  title: string;
  companyName: string;
  sido?: string;
  sigungu?: string;
  payMin?: number;
  payMax?: number;
  payUnit: string;
  status: string;
  bookmarkedAt: string;
}

export interface BookmarkStatusResponse {
  bookmarked: boolean;
  jobPublicId: string;
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

export async function addJobBookmark(jobPublicId: string): Promise<BookmarkStatusResponse> {
  return api.post<BookmarkStatusResponse>(`/bookmarks/jobs/${jobPublicId}`, {});
}

export async function removeJobBookmark(jobPublicId: string): Promise<BookmarkStatusResponse> {
  return api.delete<BookmarkStatusResponse>(`/bookmarks/jobs/${jobPublicId}`);
}

export async function getMyBookmarks(params: {
  page?: number;
  size?: number;
}): Promise<PagedResponse<JobBookmarkItem>> {
  const p = new URLSearchParams();
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.size !== undefined) p.set("size", String(params.size));
  return api.get<PagedResponse<JobBookmarkItem>>(`/bookmarks/jobs?${p.toString()}`);
}
