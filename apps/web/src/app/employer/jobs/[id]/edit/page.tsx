"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  employerApi,
  type CategoryItem,
  type CreateJobPayload,
} from "@/lib/employer-api";
import { CustomSelect } from "@/components/ui/CustomSelect";

// ─── Constants ────────────────────────────────────────────────────

const APPLICATION_TYPES = [
  {
    key: "INDIVIDUAL",
    label: "개인 지원",
    subtitle: "혼자 지원하는 개인 근로자",
    icon: "👤",
  },
  {
    key: "TEAM",
    label: "팀 지원",
    subtitle: "팀 단위로 지원하는 근로자",
    icon: "👥",
  },
  {
    key: "COMPANY",
    label: "기업 채용",
    subtitle: "기업 소속 근로자 채용",
    icon: "🏢",
  },
];

const PAY_UNITS = [
  { key: "HOURLY", label: "시급" },
  { key: "DAILY", label: "일급" },
  { key: "WEEKLY", label: "주급" },
  { key: "MONTHLY", label: "월급" },
  { key: "LUMP_SUM", label: "일시불" },
];

const VISA_TYPES = [
  { key: "CITIZEN", label: "내국인" },
  { key: "H2", label: "방문취업 H-2" },
  { key: "E9", label: "비전문 E-9" },
  { key: "E7", label: "특정활동 E-7" },
  { key: "F4", label: "재외동포 F-4" },
  { key: "F5", label: "영주 F-5" },
  { key: "F6", label: "결혼이민 F-6" },
  { key: "OTHER", label: "기타" },
];

// ─── Section wrapper ──────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-neutral-100 pt-6 mt-6 first:border-0 first:pt-0 first:mt-0">
      <h2 className="text-base font-semibold text-neutral-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Toggle card ──────────────────────────────────────────────────

function ToggleCard({
  icon,
  label,
  subtitle,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-lg border-2 transition-all text-center ${
        selected
          ? "border-primary-500 bg-primary-50"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-semibold text-neutral-900">{label}</span>
      {subtitle && (
        <span className="text-xs text-neutral-500 leading-tight">{subtitle}</span>
      )}
    </button>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-card-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-bold text-neutral-900 mb-2">
          공고를 삭제하시겠습니까?
        </h3>
        <p className="text-sm text-neutral-500 mb-6">
          삭제된 공고는 복구할 수 없습니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-neutral-200 rounded-lg py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-danger-500 rounded-lg py-2.5 text-sm font-semibold text-white hover:bg-danger-700 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const jobPublicId = params.id as string;

  // Form state
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [requiredCount, setRequiredCount] = useState(1);
  const [description, setDescription] = useState("");
  const [applicationTypes, setApplicationTypes] = useState<string[]>([]);
  const [payUnit, setPayUnit] = useState("DAILY");
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [payNegotiable, setPayNegotiable] = useState(false);
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visaRequirements, setVisaRequirements] = useState<string[]>([]);
  const [certInput, setCertInput] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [healthCheckRequired, setHealthCheckRequired] = useState(false);
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [mealProvided, setMealProvided] = useState(false);
  const [transportationProvided, setTransportationProvided] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"DRAFT" | "PUBLISHED">(
    "PUBLISHED"
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["employer", "job", jobPublicId],
    queryFn: () => employerApi.getJobDetail(jobPublicId),
    throwOnError: false,
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => employerApi.getCategories(),
    throwOnError: false,
    retry: false,
  });

  // Pre-fill form
  useEffect(() => {
    if (job) {
      setTitle(job.title ?? "");
      setCategoryId(job.categoryId ?? null);
      setRequiredCount(job.requiredCount ?? 1);
      setDescription(job.description ?? "");
      setApplicationTypes(job.applicationTypes ?? []);
      setPayUnit(job.payUnit ?? "DAILY");
      if (job.payMin != null) setPayMin(String(job.payMin));
      if (job.payMax != null) setPayMax(String(job.payMax));
      setPayNegotiable(!job.payMin && !job.payMax);
      setAlwaysOpen(job.alwaysOpen ?? false);
      setStartDate(job.startDate ?? "");
      setEndDate(job.endDate ?? "");
      setVisaRequirements(job.visaRequirements ?? []);
      setCertifications(job.certificationRequirements ?? []);
      setHealthCheckRequired(job.healthCheckRequired ?? false);
      setAccommodationProvided(job.accommodationProvided ?? false);
      setMealProvided(job.mealProvided ?? false);
      setTransportationProvided(job.transportationProvided ?? false);
      setPublishStatus(
        job.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
      );
    }
  }, [job]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CreateJobPayload>) =>
      employerApi.updateJob(jobPublicId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
      router.push("/employer/jobs");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => employerApi.deleteJob(jobPublicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
      router.push("/employer/jobs");
    },
  });

  const toggleApplicationType = (key: string) => {
    setApplicationTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleVisa = (key: string) => {
    setVisaRequirements((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const addCertification = () => {
    const trimmed = certInput.trim();
    if (trimmed && !certifications.includes(trimmed)) {
      setCertifications((prev) => [...prev, trimmed]);
      setCertInput("");
    }
  };

  const removeCertification = (cert: string) => {
    setCertifications((prev) => prev.filter((c) => c !== cert));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setValidationError("공고 제목을 입력해주세요.");
      return;
    }
    if (applicationTypes.length === 0) {
      setValidationError("지원 방식을 하나 이상 선택해주세요.");
      return;
    }
    if (!alwaysOpen && publishStatus !== "DRAFT" && !startDate) {
      setValidationError("근무 시작일을 입력해주세요.");
      return;
    }

    setValidationError(null);

    updateMutation.mutate({
      title,
      description: description || undefined,
      jobCategoryId: categoryId ?? undefined,
      requiredCount,
      applicationTypes,
      payUnit,
      payMin: !payNegotiable && payMin ? Number(payMin) : undefined,
      payMax: !payNegotiable && payMax ? Number(payMax) : undefined,
      visaRequirements,
      certificationRequirements: certifications,
      healthCheckRequired,
      alwaysOpen,
      startDate: !alwaysOpen && startDate ? startDate : undefined,
      endDate: !alwaysOpen && endDate ? endDate : undefined,
      accommodationProvided,
      mealProvided,
      transportationProvided,
    });
  };

  const inputClass =
    "w-full border border-neutral-200 rounded-lg px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 bg-white";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={() => {
            setShowDeleteModal(false);
            deleteMutation.mutate();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-neutral-500 hover:text-neutral-700 mb-2 flex items-center gap-1"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-extrabold text-neutral-950">공고 수정</h1>
        {job && (
          <p className="text-sm text-neutral-500 mt-0.5">
            {job.siteName} · {job.companyName}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {validationError && (
          <div className="mb-4 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3 text-sm text-danger-700">
            {validationError}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-card-md p-6">
          {/* Section 1 — 기본 정보 */}
          <Section title="기본 정보">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  공고 제목 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 콘크리트 타설 작업자 모집"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  직종 카테고리
                </label>
                <CustomSelect
                  options={(categories as CategoryItem[] | undefined)?.map(cat => ({ value: String(cat.id), label: cat.nameKo })) ?? []}
                  value={categoryId != null ? String(categoryId) : ""}
                  onChange={(v) => setCategoryId(v ? Number(v) : null)}
                  placeholder="카테고리 선택 (선택사항)"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  모집 인원
                </label>
                <input
                  type="number"
                  min={1}
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(Number(e.target.value))}
                  className={`${inputClass} w-32`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  공고 내용
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="업무 내용, 근무 조건 등 자세한 내용을 작성해주세요."
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </Section>

          {/* Section 2 — 지원 방식 */}
          <Section title="지원 방식">
            <div className="flex gap-3">
              {APPLICATION_TYPES.map((t) => (
                <ToggleCard
                  key={t.key}
                  icon={t.icon}
                  label={t.label}
                  subtitle={t.subtitle}
                  selected={applicationTypes.includes(t.key)}
                  onClick={() => toggleApplicationType(t.key)}
                />
              ))}
            </div>
            {applicationTypes.length === 0 && (
              <p className="text-xs text-danger-500 mt-2">
                하나 이상의 지원 방식을 선택해주세요.
              </p>
            )}
          </Section>

          {/* Section 3 — 급여 */}
          <Section title="급여 조건">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  급여 유형
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PAY_UNITS.map((u) => (
                    <button
                      key={u.key}
                      type="button"
                      onClick={() => setPayUnit(u.key)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                        payUnit === u.key
                          ? "border-primary-500 bg-primary-50 text-primary-500"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payNegotiable}
                  onChange={(e) => setPayNegotiable(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">협의 가능</span>
              </label>

              {!payNegotiable && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      최소 금액 (선택)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={payMin}
                      onChange={(e) => setPayMin(e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      최대 금액 (선택)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={payMax}
                      onChange={(e) => setPayMax(e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Section 4 — 근무 일정 */}
          <Section title="근무 일정">
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setAlwaysOpen((v) => !v)}
                  className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                    alwaysOpen ? "bg-primary-500" : "bg-neutral-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      alwaysOpen ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </div>
                <span className="text-sm text-neutral-700">상시 모집</span>
              </label>

              {!alwaysOpen && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      시작일
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Section 5 — 지원 요건 */}
          <Section title="지원 요건">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  비자 조건{" "}
                  <span className="text-neutral-400 font-normal">
                    (미선택 시 모든 비자 허용)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {VISA_TYPES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => toggleVisa(v.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
                        visaRequirements.includes(v.key)
                          ? "border-primary-500 bg-primary-50 text-primary-500"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  자격증 요건
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCertification();
                      }
                    }}
                    placeholder="자격증명 입력 후 Enter"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    추가
                  </button>
                </div>
                {certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {certifications.map((cert) => (
                      <span
                        key={cert}
                        className="flex items-center gap-1.5 bg-primary-50 text-primary-500 text-xs font-medium px-3 py-1.5 rounded-full"
                      >
                        {cert}
                        <button
                          type="button"
                          onClick={() => removeCertification(cert)}
                          className="hover:text-primary-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={healthCheckRequired}
                  onChange={(e) => setHealthCheckRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">건강검진 필요</span>
              </label>
            </div>
          </Section>

          {/* Section 6 — 복지 혜택 */}
          <Section title="복지 혜택">
            <div className="flex gap-3">
              <ToggleCard
                icon="🏠"
                label="숙소 제공"
                selected={accommodationProvided}
                onClick={() => setAccommodationProvided((v) => !v)}
              />
              <ToggleCard
                icon="🍚"
                label="식사 제공"
                selected={mealProvided}
                onClick={() => setMealProvided((v) => !v)}
              />
              <ToggleCard
                icon="🚌"
                label="교통 제공"
                selected={transportationProvided}
                onClick={() => setTransportationProvided((v) => !v)}
              />
            </div>
          </Section>

          {/* Section 7 — 게시 설정 */}
          <Section title="게시 설정">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPublishStatus("DRAFT")}
                className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-lg border-2 transition-all ${
                  publishStatus === "DRAFT"
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <span className="text-2xl">📝</span>
                <span className="text-xs font-semibold text-neutral-900">
                  임시 저장
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPublishStatus("PUBLISHED")}
                className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-lg border-2 transition-all ${
                  publishStatus === "PUBLISHED"
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <span className="text-2xl">🚀</span>
                <span className="text-xs font-semibold text-neutral-900">
                  게시 중
                </span>
              </button>
            </div>
          </Section>

          {/* Submit */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-neutral-200 rounded-lg py-3 px-5 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>

          {updateMutation.isError && (
            <p className="text-xs text-danger-500 mt-2 text-center">
              {(updateMutation.error as Error)?.message ||
                "저장에 실패했습니다. 다시 시도해주세요."}
            </p>
          )}
        </div>

        {/* Delete section */}
        <div className="mt-6 bg-white rounded-lg shadow-card border border-danger-200 p-6">
          <h3 className="text-sm font-semibold text-danger-700 mb-2">
            공고 삭제
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            삭제된 공고는 복구할 수 없습니다. 신중하게 선택해주세요.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteMutation.isPending}
            className="border border-danger-200 text-danger-500 rounded-lg py-2.5 px-5 text-sm font-semibold hover:bg-danger-50 transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? "삭제 중..." : "이 공고 삭제하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
