"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "@/lib/firebase";
import { loginWithToken, loginWithPassword, registerWithPassword } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { ConfirmationResult } from "firebase/auth";
import type { AuthResponse } from "@/lib/api";
import Link from "next/link";
import { HardHat, Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n";

// ─── Country data ──────────────────────────────────────────────────

interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
  placeholder: string;
}

const COUNTRIES: Country[] = [
  { code: "KR", dial: "+82",  flag: "🇰🇷", name: "대한민국",   placeholder: "10 1234 5678"  },
  { code: "VN", dial: "+84",  flag: "🇻🇳", name: "베트남",     placeholder: "90 1234 567"   },
  { code: "US", dial: "+1",   flag: "🇺🇸", name: "미국",       placeholder: "201 234 5678"  },
  { code: "CN", dial: "+86",  flag: "🇨🇳", name: "중국",       placeholder: "131 2345 6789" },
  { code: "JP", dial: "+81",  flag: "🇯🇵", name: "일본",       placeholder: "90 1234 5678"  },
  { code: "PH", dial: "+63",  flag: "🇵🇭", name: "필리핀",     placeholder: "917 123 4567"  },
  { code: "ID", dial: "+62",  flag: "🇮🇩", name: "인도네시아", placeholder: "812 3456 7890" },
  { code: "MY", dial: "+60",  flag: "🇲🇾", name: "말레이시아", placeholder: "12 345 6789"   },
  { code: "TH", dial: "+66",  flag: "🇹🇭", name: "태국",       placeholder: "81 234 5678"   },
  { code: "SG", dial: "+65",  flag: "🇸🇬", name: "싱가포르",   placeholder: "8123 4567"     },
  { code: "MM", dial: "+95",  flag: "🇲🇲", name: "미얀마",     placeholder: "9 123 4567"    },
  { code: "KH", dial: "+855", flag: "🇰🇭", name: "캄보디아",   placeholder: "12 345 678"    },
];

// ─── Country dropdown (portal) ─────────────────────────────────────

function CountryDropdown({
  anchorRef,
  selected,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  selected: Country;
  onSelect: (c: Country) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    function place() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) });
    }
    place();
    searchRef.current?.focus();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [mounted, anchorRef]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const panel = document.getElementById("country-dropdown-panel");
      if (panel?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [anchorRef, onClose]);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.includes(query) ||
      c.dial.includes(query) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  if (!mounted) return null;

  return createPortal(
    <div
      id="country-dropdown-panel"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: Math.min(pos.width, window.innerWidth - 16),
        zIndex: 9999,
      }}
      className="rounded-xl border border-neutral-200 bg-white shadow-card-xl overflow-hidden"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
          <svg className="w-3.5 h-3.5 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="국가 검색"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-900"
          />
        </div>
      </div>
      <ul className="max-h-[200px] overflow-y-auto overscroll-contain py-1">
        {filtered.length === 0 && (
          <li className="px-3 py-3 text-sm text-neutral-400 text-center">결과 없음</li>
        )}
        {filtered.map((c) => {
          const isSel = c.code === selected.code;
          return (
            <li key={c.code}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(c); onClose(); }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  isSel
                    ? "bg-primary-50 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="tabular-nums text-xs text-neutral-400">{c.dial}</span>
                {isSel && (
                  <svg className="w-3.5 h-3.5 shrink-0 text-primary-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="m20 6-11 11-5-5" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}

// ─── Dev users ────────────────────────────────────────────────────

const DEV_WORKERS: Array<AuthResponse & { label: string; devId: number; desc: string }> = [
  { devId: 1,  label: "김철수",       desc: "한국인 · 콘크리트 경력 8년",     userId: 1,  phone: "+82-10-1001-0001", role: "WORKER",      status: "ACTIVE", isNewUser: false },
  { devId: 2,  label: "Nguyen Van A", desc: "베트남 · E9 · 콘크리트/일반",    userId: 2,  phone: "+82-10-1002-0002", role: "WORKER",      status: "ACTIVE", isNewUser: false },
  { devId: 3,  label: "이민호",       desc: "한국인 · 철근 전문",             userId: 3,  phone: "+82-10-1004-0004", role: "WORKER",      status: "ACTIVE", isNewUser: false },
  { devId: 4,  label: "Tran Thi B",   desc: "베트남 · E9 · 타일/미장",        userId: 4,  phone: "+82-10-1005-0005", role: "WORKER",      status: "ACTIVE", isNewUser: false },
  { devId: 12, label: "홍길동",       desc: "한국인 · 방수 전문",             userId: 12, phone: "+82-10-1008-0008", role: "WORKER",      status: "ACTIVE", isNewUser: false },
  { devId: 18, label: "윤재원",       desc: "한국인 · 거푸집 전문 14년",      userId: 18, phone: "+82-10-1014-0014", role: "WORKER",      status: "ACTIVE", isNewUser: false },
];

const DEV_TEAM_LEADERS: Array<AuthResponse & { label: string; devId: number; desc: string }> = [
  { devId: 6,  label: "박팀장",  desc: "콘크리트팀 · 2인 · 수도권",         userId: 6,  phone: "+82-10-1003-0003", role: "TEAM_LEADER", status: "ACTIVE", isNewUser: false },
  { devId: 7,  label: "정수진",  desc: "전기팀 · 단독 · 서울/용인",         userId: 7,  phone: "+82-10-1007-0007", role: "TEAM_LEADER", status: "ACTIVE", isNewUser: false },
  { devId: 20, label: "오재현",  desc: "전기팀 · 전기산업기사 · 전국",      userId: 20, phone: "+82-10-1016-0016", role: "TEAM_LEADER", status: "ACTIVE", isNewUser: false },
  { devId: 21, label: "김민석",  desc: "도장팀 · 인테리어 마감 전문",       userId: 21, phone: "+82-10-1017-0017", role: "TEAM_LEADER", status: "ACTIVE", isNewUser: false },
];

const DEV_EMPLOYERS: Array<AuthResponse & { label: string; devId: number; desc: string }> = [
  { devId: 8,  label: "이사장",  desc: "(주)GADA건설 · 대표",        userId: 8,  phone: "+82-10-2001-0001", role: "EMPLOYER", status: "ACTIVE", isNewUser: false },
  { devId: 9,  label: "김부장",  desc: "신흥건설(주) · 인사팀장",    userId: 9,  phone: "+82-10-2002-0002", role: "EMPLOYER", status: "ACTIVE", isNewUser: false },
  { devId: 10, label: "최대표",  desc: "한국건설개발(주) · 대표",    userId: 10, phone: "+82-10-2003-0003", role: "EMPLOYER", status: "ACTIVE", isNewUser: false },
];

const IS_LOCAL_DEV = process.env.NODE_ENV === "development";

type Mode = "login" | "signup";
type LoginTab = "worker" | "employer";
// Signup steps: phone → otp → password
type SignupStep = "phone" | "otp" | "password";

// ─── Component ────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<Mode>("login");
  const [tab, setTab] = useState<LoginTab>("worker");

  // ── Login state ──
  const [loginCountry, setLoginCountry] = useState<Country>(COUNTRIES[0]);
  const [loginLocal, setLoginLocal] = useState("");
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const loginCountryBtnRef = useRef<HTMLButtonElement>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ── Signup state ──
  const [signupStep, setSignupStep] = useState<SignupStep>("phone");
  const [signupName, setSignupName] = useState("");
  const [signupCountry, setSignupCountry] = useState<Country>(COUNTRIES[0]);
  const [signupLocal, setSignupLocal] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const [signupOtp, setSignupOtp] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null); // Firebase ID token after OTP
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [showSignupPw, setShowSignupPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = useT();

  function reset() {
    setLoginLocal(""); setLoginPassword(""); setError("");
    setSignupStep("phone"); setSignupName(""); setSignupLocal(""); setSignupOtp("");
    setSignupPassword(""); setSignupPasswordConfirm(""); setOtpToken(null); setError("");
  }

  function switchMode(m: Mode) { reset(); setMode(m); }
  function switchTab(t: LoginTab) { reset(); setTab(t); }

  useEffect(() => { return () => { recaptchaRef.current?.clear(); }; }, []);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const id = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [otpCountdown]);

  function toE164(country: Country, local: string): string {
    const digits = local.replace(/\D/g, "").replace(/^0+/, "");
    return country.dial + digits;
  }

  function handleDevLogin(devUser: { devId: number; label: string; desc: string } & AuthResponse) {
    localStorage.setItem("gada_dev_user_id", devUser.devId.toString());
    const { devId, label, desc, ...authUser } = devUser;
    setUser(authUser);
    router.replace("/");
  }

  // ── Login handler ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const authData = await loginWithPassword({ phone: toE164(loginCountry, loginLocal), password: loginPassword });
      setUser(authData);
      router.replace(authData.status === "PENDING" ? "/onboarding" : "/");
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally { setLoading(false); }
  }

  // ── Signup: send OTP ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!signupName.trim()) { setError("이름을 입력해주세요."); return; }
    setError(""); setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      }
      const confirmation = await signInWithPhoneNumber(auth, toE164(signupCountry, signupLocal), recaptchaRef.current);
      confirmationRef.current = confirmation;
      setSignupStep("otp"); setOtpCountdown(60);
    } catch (err: any) {
      setError(getOtpErrorMessage(err.code));
      recaptchaRef.current?.clear(); recaptchaRef.current = null;
    } finally { setLoading(false); }
  }

  // ── Signup: verify OTP ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await confirmationRef.current!.confirm(signupOtp);
      const token = await result.user.getIdToken();
      setOtpToken(token);
      setSignupStep("password");
    } catch (err: any) {
      setError(getOtpErrorMessage(err.code || err.errorCode));
    } finally { setLoading(false); }
  }

  // ── Signup: set password & register ──
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (signupPassword !== signupPasswordConfirm) {
      setError("비밀번호가 일치하지 않습니다."); return;
    }
    setError(""); setLoading(true);
    try {
      const authData = await registerWithPassword({
        name: signupName.trim(),
        phone: toE164(signupCountry, signupLocal),
        firebaseOtpToken: otpToken ?? undefined,
        password: signupPassword,
      });
      setUser(authData);
      router.replace("/onboarding");
    } catch (err: any) {
      setError(err.message || "회원가입에 실패했습니다.");
    } finally { setLoading(false); }
  }

  function getOtpErrorMessage(code: string): string {
    const m: Record<string, string> = {
      "auth/invalid-phone-number": t("auth.invalidPhone"),
      "auth/too-many-requests": t("auth.tooManyRequests"),
      "auth/invalid-verification-code": t("auth.invalidOtp"),
      "auth/code-expired": t("auth.expiredOtp"),
      "auth/quota-exceeded": t("auth.dailyLimit"),
    };
    return m[code] || t("auth.genericError");
  }

  const isEmployer = tab === "employer";
  const accentFocus = isEmployer
    ? "focus-within:border-warning-500 focus-within:ring-warning-100"
    : "focus-within:border-primary-500 focus-within:ring-primary-100";
  const btnClass = isEmployer
    ? "bg-warning-500 text-white hover:bg-warning-700"
    : "bg-primary-500 text-white hover:bg-primary-600";

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col items-center justify-center bg-primary-500 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative z-10 px-12 w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 mb-8 w-fit">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 border border-white/30">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">가다<span className="text-white/60 font-black"> Team</span></span>
          </Link>
          <h2 className="font-display text-2xl font-bold text-white leading-snug mb-3">
            {t("auth.heroTitle")}
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-10">
            {t("auth.heroSub")}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: "👷", title: t("role.worker"), desc: t("auth.feat.jobs") },
              { icon: "🏗️", title: t("nav.teams"), desc: t("auth.feat.team") },
              { icon: "🏢", title: t("auth.feat.hire"), desc: t("auth.feat.hire") },
              { icon: "📋", title: t("auth.feat.contract"), desc: t("auth.feat.contract") },
            ].map((item) => (
              <div key={item.title} className="rounded-lg bg-white/10 p-3.5">
                <div className="text-lg mb-1.5">{item.icon}</div>
                <div className="text-white font-medium text-sm">{item.title}</div>
                <div className="text-white/50 text-xs mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-1">
            <div className="inline-flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
                <HardHat className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-neutral-900">가다<span className="text-primary-500 font-black"> Team</span></span>
            </div>
            <p className="text-xs text-neutral-400">{t("auth.heroSub")}</p>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden shadow-card">
            {/* Role tabs */}
            <div className="flex border-b border-neutral-200">
              <button
                onClick={() => switchTab("worker")}
                className={`relative flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === "worker" ? "text-primary-500" : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                🦺 {t("auth.workerTab")}
                {tab === "worker" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-primary-500" />
                )}
              </button>
              <button
                onClick={() => switchTab("employer")}
                className={`relative flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === "employer" ? "text-warning-700" : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                🏗️ {t("auth.employerTab")}
                {tab === "employer" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-warning-500" />
                )}
              </button>
            </div>

            {/* Form body */}
            <div className="p-6">
              {/* ─── LOGIN MODE ─── */}
              {mode === "login" && (
                <>
                  <div className="mb-5">
                    <h1 className="font-display text-lg font-semibold text-neutral-900">
                      {isEmployer ? t("auth.employerLogin") : t("auth.workerLogin")}
                    </h1>
                    <p className="mt-1 text-xs text-neutral-400">
                      {isEmployer ? t("auth.employerDesc") : t("auth.workerDesc")}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                        전화번호
                      </label>
                      <div className={`flex items-center rounded-md border bg-white transition-colors focus-within:ring-2 border-neutral-200 ${accentFocus}`}>
                        <button
                          ref={loginCountryBtnRef}
                          type="button"
                          onClick={() => setLoginDropdownOpen((v) => !v)}
                          className="flex shrink-0 items-center gap-1.5 border-r border-neutral-200 px-3 py-2.5 hover:bg-neutral-50 rounded-l-md"
                        >
                          <span className="text-base leading-none">{loginCountry.flag}</span>
                          <span className="text-sm font-semibold text-neutral-700 tabular-nums">{loginCountry.dial}</span>
                          <svg className={`w-3 h-3 text-neutral-400 transition-transform ${loginDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                        {loginDropdownOpen && (
                          <CountryDropdown
                            anchorRef={loginCountryBtnRef}
                            selected={loginCountry}
                            onSelect={(c) => { setLoginCountry(c); setLoginLocal(""); }}
                            onClose={() => setLoginDropdownOpen(false)}
                          />
                        )}
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={loginLocal}
                          onChange={(e) => setLoginLocal(e.target.value.replace(/[^\d\s\-]/g, ""))}
                          placeholder={loginCountry.placeholder}
                          autoComplete="tel-national"
                          required
                          className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                        비밀번호
                      </label>
                      <div className={`flex items-center rounded-md border border-neutral-200 bg-white focus-within:ring-2 ${accentFocus}`}>
                        <input
                          type={showLoginPw ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="비밀번호 입력"
                          autoComplete="current-password"
                          required
                          className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowLoginPw((v) => !v)}
                          className="px-3 text-neutral-400 hover:text-neutral-600"
                        >
                          {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && <p className="text-sm text-danger-500">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading || loginLocal.replace(/\D/g, "").length < 7 || !loginPassword}
                      className={`w-full rounded-md py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${btnClass}`}
                    >
                      {loading ? "로그인 중…" : t("auth.loginBtn")}
                    </button>
                  </form>

                  {/* Dev quick login */}
                  {IS_LOCAL_DEV && (
                    <details className="mt-4">
                      <summary className="cursor-pointer select-none text-center text-[11px] text-neutral-300 hover:text-neutral-400">
                        {t("auth.devAccounts")}
                      </summary>
                      <div className="mt-3 space-y-1.5">
                        {tab === "worker" ? (
                          <>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("role.worker")}</p>
                            {DEV_WORKERS.map((u) => (
                              <button key={u.devId} onClick={() => handleDevLogin(u)}
                                className="flex w-full items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-left hover:bg-neutral-50 transition-colors">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-700">{u.devId}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-neutral-800">{u.label}</p>
                                  <p className="truncate text-[10px] text-neutral-400">{u.desc}</p>
                                </div>
                              </button>
                            ))}
                            <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("role.teamLeader")}</p>
                            {DEV_TEAM_LEADERS.map((u) => (
                              <button key={u.devId} onClick={() => handleDevLogin(u)}
                                className="flex w-full items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-left hover:bg-neutral-50 transition-colors">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary-50 text-[10px] font-bold text-secondary-600">{u.devId}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-neutral-800">{u.label}</p>
                                  <p className="truncate text-[10px] text-neutral-400">{u.desc}</p>
                                </div>
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("role.employer")}</p>
                            {DEV_EMPLOYERS.map((u) => (
                              <button key={u.devId} onClick={() => handleDevLogin(u)}
                                className="flex w-full items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-left hover:bg-neutral-50 transition-colors">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-warning-50 text-[10px] font-bold text-warning-700">{u.devId}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-neutral-800">{u.label}</p>
                                  <p className="truncate text-[10px] text-neutral-400">{u.desc}</p>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </details>
                  )}
                </>
              )}

              {/* ─── SIGNUP MODE ─── */}
              {mode === "signup" && (
                <>
                  <div className="mb-5">
                    <h1 className="font-display text-lg font-semibold text-neutral-900">
                      {isEmployer ? t("auth.employerRegister") : t("auth.workerRegister")}
                    </h1>
                    {/* Step indicator */}
                    <div className="mt-3 flex items-center gap-1.5">
                      {(["phone", "otp", "password"] as SignupStep[]).map((s, i) => (
                        <div key={s} className="flex items-center gap-1.5">
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                            signupStep === s
                              ? isEmployer ? "bg-warning-500 text-white" : "bg-primary-500 text-white"
                              : ["phone", "otp", "password"].indexOf(signupStep) > i
                                ? "bg-success-500 text-white"
                                : "bg-neutral-200 text-neutral-500"
                          }`}>
                            {["phone", "otp", "password"].indexOf(signupStep) > i ? "✓" : i + 1}
                          </div>
                          {i < 2 && <div className={`h-px flex-1 w-6 ${["phone", "otp", "password"].indexOf(signupStep) > i ? "bg-success-400" : "bg-neutral-200"}`} />}
                        </div>
                      ))}
                      <span className="ml-1 text-xs text-neutral-400">
                        {signupStep === "phone" ? "전화번호 입력" : signupStep === "otp" ? "인증번호 확인" : "비밀번호 설정"}
                      </span>
                    </div>
                  </div>

                  {/* Step 1: name + phone */}
                  {signupStep === "phone" && (
                    <form onSubmit={handleSendOtp} className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-600">이름</label>
                        <input
                          type="text"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          placeholder="실명을 입력하세요"
                          autoComplete="name"
                          required
                          className={`w-full rounded-md border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-${isEmployer ? "warning" : "primary"}-500 focus:ring-2 focus:ring-${isEmployer ? "warning" : "primary"}-100`}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-600">전화번호</label>
                        <div className={`flex items-center rounded-md border bg-white transition-colors focus-within:ring-2 border-neutral-200 ${accentFocus}`}>
                          <button
                            ref={countryBtnRef}
                            type="button"
                            onClick={() => setDropdownOpen((v) => !v)}
                            className="flex shrink-0 items-center gap-1.5 border-r border-neutral-200 px-3 py-2.5 hover:bg-neutral-50 rounded-l-md"
                          >
                            <span className="text-base leading-none">{signupCountry.flag}</span>
                            <span className="text-sm font-semibold text-neutral-700 tabular-nums">{signupCountry.dial}</span>
                            <svg className={`w-3 h-3 text-neutral-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                          {dropdownOpen && (
                            <CountryDropdown
                              anchorRef={countryBtnRef}
                              selected={signupCountry}
                              onSelect={(c) => { setSignupCountry(c); setSignupLocal(""); }}
                              onClose={() => setDropdownOpen(false)}
                            />
                          )}
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={signupLocal}
                            onChange={(e) => setSignupLocal(e.target.value.replace(/[^\d\s\-]/g, ""))}
                            placeholder={signupCountry.placeholder}
                            autoComplete="tel-national"
                            required
                            className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                          />
                        </div>
                      </div>

                      {error && <p className="text-sm text-danger-500">{error}</p>}

                      <button
                        type="submit"
                        disabled={loading || !signupName.trim() || signupLocal.replace(/\D/g, "").length < 7}
                        className={`w-full rounded-md py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${btnClass}`}
                      >
                        {loading ? "전송 중…" : "인증번호 받기"}
                      </button>
                    </form>
                  )}

                  {/* Step 2: OTP */}
                  {signupStep === "otp" && (
                    <div className="space-y-3">
                      <button onClick={() => { setSignupStep("phone"); setSignupOtp(""); setError(""); }} className="mb-1 text-sm text-neutral-400 hover:text-neutral-600">
                        ← 뒤로
                      </button>
                      <p className="text-sm text-neutral-500">
                        <span className="font-semibold text-neutral-900">{toE164(signupCountry, signupLocal)}</span>로 전송된 인증번호를 입력하세요.
                      </p>
                      <form onSubmit={handleVerifyOtp} className="space-y-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={signupOtp}
                          onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="인증번호 6자리"
                          autoFocus
                          className="w-full rounded-md border border-neutral-200 px-3.5 py-2.5 text-center text-sm font-semibold tracking-[0.4em] text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                        />
                        {error && <p className="text-sm text-danger-500">{error}</p>}
                        <button
                          type="submit"
                          disabled={loading || signupOtp.length !== 6}
                          className={`w-full rounded-md py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${btnClass}`}
                        >
                          {loading ? "확인 중…" : "인증번호 확인"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSignupStep("phone"); setSignupOtp(""); }}
                          disabled={otpCountdown > 0}
                          className="w-full py-2 text-sm text-neutral-400 disabled:opacity-40"
                        >
                          {otpCountdown > 0 ? `재발송 (${otpCountdown}초)` : "재발송"}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Step 3: password */}
                  {signupStep === "password" && (
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-600">비밀번호 설정</label>
                        <div className={`flex items-center rounded-md border border-neutral-200 bg-white focus-within:ring-2 ${accentFocus}`}>
                          <input
                            type={showSignupPw ? "text" : "password"}
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="6자 이상"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            autoFocus
                            className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowSignupPw((v) => !v)} className="px-3 text-neutral-400 hover:text-neutral-600">
                            {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-neutral-600">비밀번호 확인</label>
                        <input
                          type="password"
                          value={signupPasswordConfirm}
                          onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                          placeholder="비밀번호 재입력"
                          autoComplete="new-password"
                          required
                          className={`w-full rounded-md border px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 ${
                            signupPasswordConfirm && signupPassword !== signupPasswordConfirm
                              ? "border-danger-300 focus:border-danger-500 focus:ring-danger-100"
                              : `border-neutral-200 focus:border-${isEmployer ? "warning" : "primary"}-500 focus:ring-${isEmployer ? "warning" : "primary"}-100`
                          }`}
                        />
                        {signupPasswordConfirm && signupPassword !== signupPasswordConfirm && (
                          <p className="mt-1 text-xs text-danger-500">비밀번호가 일치하지 않습니다.</p>
                        )}
                      </div>

                      {error && <p className="text-sm text-danger-500">{error}</p>}

                      <button
                        type="submit"
                        disabled={loading || signupPassword.length < 6 || signupPassword !== signupPasswordConfirm}
                        className={`w-full rounded-md py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${btnClass}`}
                      >
                        {loading ? "가입 중…" : "가입 완료"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>

            {/* Switch mode */}
            <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-center">
              {mode === "login" ? (
                <p className="text-sm text-neutral-500">
                  {t("auth.noAccount")}{" "}
                  <button onClick={() => switchMode("signup")} className="font-semibold text-primary-500 hover:text-primary-600">
                    {t("auth.register")}
                  </button>
                </p>
              ) : (
                <p className="text-sm text-neutral-500">
                  {t("auth.hasAccount")}{" "}
                  <button onClick={() => switchMode("login")} className="font-semibold text-primary-500 hover:text-primary-600">
                    {t("auth.loginBtn")}
                  </button>
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-400">
            {t("auth.termsPrefix")}{" "}
            <a href="#" className="underline hover:text-neutral-600">{t("auth.terms")}</a>과{" "}
            <a href="#" className="underline hover:text-neutral-600">{t("auth.privacy")}</a>{t("common.agreeTo")}
          </p>
        </div>
      </div>

      <div id="recaptcha-container" />
    </div>
  );
}
