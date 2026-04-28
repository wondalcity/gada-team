"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onboard } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type SetupStep = "basic" | "identity" | "preferences";

// ─── Static data ──────────────────────────────────────────────────────────────

const NATIONALITIES = [
  { value: "KR", label: "한국" },
  { value: "VN", label: "베트남" },
  { value: "CN", label: "중국" },
  { value: "PH", label: "필리핀" },
  { value: "ID", label: "인도네시아" },
  { value: "OTHER", label: "기타" },
];

const VISA_TYPES = [
  { value: "CITIZEN", label: "내국인" },
  { value: "F4", label: "재외동포 (F-4)" },
  { value: "F5", label: "영주 (F-5)" },
  { value: "F6", label: "결혼이민 (F-6)" },
  { value: "H2", label: "방문취업 (H-2)" },
  { value: "E9", label: "비전문취업 (E-9)" },
  { value: "E7", label: "특정활동 (E-7)" },
  { value: "OTHER", label: "기타" },
];

const LANGUAGE_OPTIONS = [
  { code: "vi", label: "베트남어" },
  { code: "en", label: "영어" },
  { code: "zh", label: "중국어" },
];

const LANGUAGE_LEVELS = [
  { value: "BASIC", label: "기초" },
  { value: "INTERMEDIATE", label: "중급" },
  { value: "FLUENT", label: "유창" },
  { value: "NATIVE", label: "원어민" },
];

const JOB_CATEGORIES = [
  { id: 1, label: "콘크리트공" },
  { id: 2, label: "철근공" },
  { id: 3, label: "비계공" },
  { id: 4, label: "목공" },
  { id: 5, label: "전기공" },
  { id: 6, label: "배관공" },
  { id: 7, label: "타일공" },
  { id: 8, label: "도장공" },
  { id: 9, label: "미장공" },
  { id: 10, label: "일반노무" },
  { id: 11, label: "중장비 기사" },
  { id: 12, label: "안전관리" },
];

// ─── Progress indicator ───────────────────────────────────────────────────────

type StepStatus = "active" | "completed" | "future";

function ProgressIndicator({
  steps,
}: {
  steps: { label: string; status: StepStatus }[];
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                s.status === "completed"
                  ? "bg-success-500 text-white"
                  : s.status === "active"
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-200 text-neutral-400"
              }`}
            >
              {s.status === "completed" ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1 text-xs whitespace-nowrap ${
                s.status === "active"
                  ? "text-primary-500 font-medium"
                  : s.status === "completed"
                  ? "text-success-500"
                  : "text-neutral-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 h-0.5 mb-5 mx-1 transition-all ${
                s.status === "completed" ? "bg-green-400" : "bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [step, setStep] = useState<SetupStep>("basic");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("KR");
  const [visaType, setVisaType] = useState("CITIZEN");
  const [languages, setLanguages] = useState<{ code: string; level: string }[]>(
    [{ code: "ko", level: "NATIVE" }]
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [payUnit, setPayUnit] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) return null;

  const isEmployer = user.role === "EMPLOYER";
  const steps: SetupStep[] = isEmployer ? ["basic"] : ["basic", "identity", "preferences"];
  const stepLabels = isEmployer ? ["기본정보"] : ["기본정보", "신원", "선호조건"];
  const currentStepIndex = steps.indexOf(step);

  const progressSteps = steps.map((s, i) => ({
    label: stepLabels[i],
    status:
      i < currentStepIndex
        ? ("completed" as const)
        : i === currentStepIndex
        ? ("active" as const)
        : ("future" as const),
  }));

  function goNext() {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }

  function goBack() {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else router.back();
  }

  function handleNationalityChange(val: string) {
    setNationality(val);
    if (val === "KR") setVisaType("CITIZEN");
    else if (visaType === "CITIZEN") setVisaType("H2");
  }

  function addLanguage(code: string) {
    if (languages.find((l) => l.code === code)) return;
    setLanguages([...languages, { code, level: "BASIC" }]);
  }

  function removeLanguage(code: string) {
    if (code === "ko") return;
    setLanguages(languages.filter((l) => l.code !== code));
  }

  function updateLanguageLevel(code: string, level: string) {
    setLanguages(languages.map((l) => (l.code === code ? { ...l, level } : l)));
  }

  function getLangLabel(code: string) {
    if (code === "ko") return "한국어";
    return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
  }

  function toggleCategory(id: number) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(skipPreferences = false) {
    setError("");
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const idToken = currentUser
        ? await currentUser.getIdToken().catch(() => undefined)
        : undefined;

      const result = await onboard({
        idToken,
        role: user!.role as "WORKER" | "TEAM_LEADER" | "EMPLOYER",
        fullName,
        birthDate: !isEmployer ? birthDate || undefined : undefined,
        nationality: !isEmployer ? nationality || undefined : undefined,
        visaType: !isEmployer ? visaType || undefined : undefined,
        languages: !isEmployer && !skipPreferences ? languages.filter((l) => l.code) : undefined,
        desiredJobCategories:
          !isEmployer && !skipPreferences && selectedCategories.length > 0
            ? selectedCategories
            : undefined,
        desiredPayMin: !skipPreferences && payMin ? parseInt(payMin) : undefined,
        desiredPayMax: !skipPreferences && payMax ? parseInt(payMax) : undefined,
        desiredPayUnit:
          !skipPreferences && (payMin || payMax) ? payUnit : undefined,
      });
      setUser(result);
      router.replace("/profile");
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const basicValid = fullName.trim().length > 0 && (isEmployer || birthDate.length > 0);

  function renderBasicStep() {
    return (
      <>
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">기본 정보 입력</h1>
        <p className="text-sm text-neutral-500 mb-5">서비스 이용에 필요한 정보를 입력해주세요.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              이름 <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="홍길동"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
            />
          </div>
          {!isEmployer && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                생년월일 <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
              />
            </div>
          )}
        </div>
        {error && <p className="text-sm text-danger-500 mt-3">{error}</p>}
        <button
          onClick={isEmployer ? () => handleSubmit() : goNext}
          disabled={loading || !basicValid}
          className="w-full mt-5 py-3 rounded-lg bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "처리 중…" : isEmployer ? "등록 완료" : "다음"}
        </button>
      </>
    );
  }

  function renderIdentityStep() {
    return (
      <>
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">신원 정보</h1>
        <p className="text-sm text-neutral-500 mb-5">국적과 비자 종류를 선택해주세요.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">국적</label>
            <select
              value={nationality}
              onChange={(e) => handleNationalityChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm bg-white"
            >
              {NATIONALITIES.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>
          {nationality !== "KR" && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">비자 종류</label>
              <select
                value={visaType}
                onChange={(e) => setVisaType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm bg-white"
              >
                {VISA_TYPES.filter((v) => v.value !== "CITIZEN").map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          onClick={goNext}
          className="w-full mt-5 py-3 rounded-lg bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
        >
          다음
        </button>
      </>
    );
  }

  function renderPreferencesStep() {
    const availableLangOptions = LANGUAGE_OPTIONS.filter(
      (opt) => !languages.find((l) => l.code === opt.code)
    );
    return (
      <>
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">선호 조건</h1>
        <p className="text-sm text-neutral-500 mb-5">원하시면 나중에 변경할 수 있습니다.</p>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">언어 설정</label>
            <div className="space-y-2">
              {languages.map((lang) => (
                <div key={lang.code} className="flex items-center gap-2 bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-neutral-700 flex-1 font-medium">{getLangLabel(lang.code)}</span>
                  <select
                    value={lang.level}
                    onChange={(e) => updateLanguageLevel(lang.code, e.target.value)}
                    disabled={lang.code === "ko"}
                    className="text-xs border border-neutral-200 rounded-lg px-2 py-1 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-default"
                  >
                    {LANGUAGE_LEVELS.map((lv) => (
                      <option key={lv.value} value={lv.value}>{lv.label}</option>
                    ))}
                  </select>
                  {lang.code !== "ko" && (
                    <button type="button" onClick={() => removeLanguage(lang.code)} className="text-neutral-400 hover:text-neutral-600 text-base leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            {availableLangOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {availableLangOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => addLanguage(opt.code)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-dashed border-neutral-300 text-neutral-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
                  >
                    + {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">희망 직종</label>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((cat) => {
                const selected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selected ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">희망 급여</label>
            <div className="flex rounded-lg border border-neutral-200 overflow-hidden mb-3 w-fit">
              {(["DAILY", "MONTHLY"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setPayUnit(unit)}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    payUnit === unit ? "bg-primary-500 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  {unit === "DAILY" ? "일급" : "월급"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={payMin}
                onChange={(e) => setPayMin(e.target.value)}
                placeholder="최소 금액"
                min={0}
                className="flex-1 px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
              />
              <span className="flex items-center text-neutral-400 text-sm">~</span>
              <input
                type="number"
                value={payMax}
                onChange={(e) => setPayMax(e.target.value)}
                placeholder="최대 금액"
                min={0}
                className="flex-1 px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1">단위: 원 (KRW) · 미입력 시 협의</p>
          </div>
        </div>
        {error && <p className="text-sm text-danger-500 mt-3">{error}</p>}
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="w-full mt-5 py-3 rounded-lg bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "처리 중…" : "등록 완료"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="w-full mt-2 py-2 text-sm text-neutral-400 hover:text-neutral-600 disabled:opacity-40"
        >
          건너뛰기
        </button>
      </>
    );
  }

  function renderStep() {
    switch (step) {
      case "basic": return renderBasicStep();
      case "identity": return renderIdentityStep();
      case "preferences": return renderPreferencesStep();
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-lg mx-auto">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-xl font-bold text-neutral-900">GADA</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">프로필 등록</p>
        </div>

        {/* Progress indicator */}
        <ProgressIndicator steps={progressSteps} />

        {/* Card */}
        <div className="bg-white rounded-lg shadow-card-md p-6 relative">
          {step !== "basic" && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-neutral-500 mb-4 hover:text-neutral-700"
            >
              ← 뒤로
            </button>
          )}
          {step === "basic" && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm text-neutral-500 mb-4 hover:text-neutral-700"
            >
              ← 뒤로
            </button>
          )}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
