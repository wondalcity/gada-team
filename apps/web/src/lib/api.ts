import { auth } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

function getDevUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gada_dev_user_id");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    const devUserId = getDevUserId();
    if (devUserId) {
      headers["X-Dev-User-Id"] = devUserId;
    }
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();

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
  role: "WORKER" | "TEAM_LEADER" | "EMPLOYER" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  isNewUser: boolean;
}

export async function loginWithToken(idToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", { idToken });
}

export async function onboard(payload: {
  idToken: string;
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
