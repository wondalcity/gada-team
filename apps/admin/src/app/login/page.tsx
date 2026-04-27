"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const IS_LOCAL_DEV = process.env.NODE_ENV === "development";

// Dev admin accounts (only shown in local dev)
// firebaseUid is used as the X-Dev-User-Id header — more stable than numeric ID
const DEV_ADMINS = [
  { firebaseUid: "dev-admin-1", label: "슈퍼 관리자", phone: "+82-10-9001-0001", desc: "SUPER_ADMIN · dev-admin-1" },
];

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gada_admin_token");
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken() || localStorage.getItem("gada_admin_user_id")) {
      router.replace("/dashboard");
    }
  }, [router]);

  function handleDevLogin(admin: { firebaseUid: string; label: string }) {
    localStorage.setItem("gada_admin_user_id", admin.firebaseUid);
    localStorage.removeItem("gada_admin_token");
    router.replace("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((json as { message?: string }).message || "로그인에 실패했습니다.");
      }

      const data = (json as { data: { userId: number; role: string; token?: string } }).data;

      if (data.role !== "ADMIN") {
        throw new Error("관리자 계정이 아닙니다.");
      }

      if (!data.token) {
        throw new Error("인증 토큰을 받지 못했습니다.");
      }

      localStorage.setItem("gada_admin_token", data.token);
      localStorage.setItem("gada_admin_user_id", String(data.userId));
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400">
              <span className="text-neutral-900 font-black text-xl">G</span>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-xl tracking-tight">GADA Admin</p>
              <p className="text-neutral-400 text-xs">운영 관리 콘솔</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700">
          <h2 className="text-white font-semibold text-base mb-1">관리자 로그인</h2>
          <p className="text-neutral-400 text-sm mb-6">
            전화번호와 비밀번호로 로그인하세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+82 10 1234 5678"
                required
                autoComplete="tel"
                className="w-full rounded-xl bg-neutral-700 border border-neutral-600 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-neutral-700 border border-neutral-600 px-4 py-3 pr-11 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span>⚠</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !phone || !password}
              className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-500 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>

        {/* Dev quick login */}
        {IS_LOCAL_DEV && (
          <details className="mt-4">
            <summary className="cursor-pointer select-none text-center text-[11px] text-neutral-600 hover:text-neutral-400">
              개발용 빠른 로그인
            </summary>
            <div className="mt-3 space-y-1.5">
              {DEV_ADMINS.map((admin) => (
                <button
                  key={admin.firebaseUid}
                  onClick={() => handleDevLogin(admin)}
                  className="flex w-full items-center gap-2 rounded-lg border border-neutral-700 px-2.5 py-2 text-left hover:bg-neutral-700 transition-colors"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-400">
                    A
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-neutral-200">{admin.label}</p>
                    <p className="truncate text-[10px] text-neutral-500">{admin.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </details>
        )}

        <p className="text-center text-xs text-neutral-600 mt-4">
          GADA 운영 관리 콘솔 — 권한이 있는 계정만 접근 가능합니다
        </p>
      </div>
    </div>
  );
}
