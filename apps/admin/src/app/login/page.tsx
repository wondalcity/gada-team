"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminUserId } from "@/lib/api";

// ─── Hardcoded admin credentials (dev/demo) ───────────────────────────────────
// In production, replace with a real auth API call.
const ADMIN_ACCOUNTS: { email: string; password: string; userId: number; label: string }[] = [
  { email: "admin@gada.kr",       password: "gada1234!",  userId: 11, label: "플랫폼 관리자" },
  { email: "superadmin@gada.kr",  password: "super1234!", userId: 11, label: "슈퍼 관리자" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminUserId()) {
      router.replace("/dashboard");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const matched = ADMIN_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password
    );

    if (!matched) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    localStorage.setItem("gada_admin_user_id", matched.userId.toString());
    router.replace("/dashboard");
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
            관리자 계정으로 로그인하세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gada.kr"
                required
                autoComplete="email"
                className="w-full rounded-xl bg-neutral-700 border border-neutral-600 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-xl bg-neutral-700 border border-neutral-600 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="text-red-400">⚠</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-500 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-4">
          GADA 운영 관리 콘솔 — 권한이 있는 계정만 접근 가능합니다
        </p>
      </div>
    </div>
  );
}
