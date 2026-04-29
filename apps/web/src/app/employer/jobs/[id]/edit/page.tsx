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
import { DateInput } from "@/components/ui/DateInput";
import { useT } from "@/lib/i18n";

// ─── Constants ────────────────────────────────────────────────────

function getApplicationTypes(t: ReturnType<typeof useT>) {
  return [
    { key: "INDIVIDUAL", label: t("employer.appTypeIndividual"), subtitle: t("employer.appTypeIndividualSub"), icon: "👤" },
    { key: "TEAM", label: t("employer.appTypeTeam"), subtitle: t("employer.appTypeTeamSub"), icon: "👥" },
    { key: "COMPANY", label: t("employer.appTypeCompany"), subtitle: t("employer.appTypeCompanySub"), icon: "🏢" },
  ];
}

function getPayUnits(t: ReturnType<typeof useT>) {
  return [
    { key: "HOURLY", label: t("employer.payUnitHourly") },
    { key: "DAILY", label: t("employer.payUnitDaily") },
    { key: "WEEKLY", label: t("employer.payUnitWeekly") },
    { key: "MONTHLY", label: t("employer.payUnitMonthly") },
    { key: "LUMP_SUM", label: t("employer.payUnitLumpSum") },
  ];
}

function getVisaTypes(t: ReturnType<typeof useT>) {
  return [
    { key: "CITIZEN", label: t("employer.visaCitizen") },
    { key: "H2", label: t("employer.visaH2") },
    { key: "E9", label: t("employer.visaE9") },
    { key: "E7", label: t("employer.visaE7") },
    { key: "F4", label: t("employer.visaF4") },
    { key: "F5", label: t("employer.visaF5") },
    { key: "F6", label: t("employer.visaF6") },
    { key: "OTHER", label: t("employer.visaOther") },
  ];
}

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
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-card-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-bold text-neutral-900 mb-2">
          {t("employer.jobDeleteTitle")}
        </h3>
        <p className="text-sm text-neutral-500 mb-6">
          {t("employer.jobDeleteWarning")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-neutral-200 rounded-lg py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            {t("employer.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-danger-500 rounded-lg py-2.5 text-sm font-semibold text-white hover:bg-danger-700 transition-colors"
          >
            {t("employer.delete")}
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
  const t = useT();

  const APPLICATION_TYPES = getApplicationTypes(t);
  const PAY_UNITS = getPayUnits(t);
  const VISA_TYPES = getVisaTypes(t);

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
      setValidationError(t("employer.jobTitleRequired"));
      return;
    }
    if (applicationTypes.length === 0) {
      setValidationError(t("employer.appTypeRequired"));
      return;
    }
    if (!alwaysOpen && publishStatus !== "DRAFT" && !startDate) {
      setValidationError(t("employer.startDateRequired"));
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
          {t("employer.back")}
        </button>
        <h1 className="text-xl font-extrabold text-neutral-950">{t("employer.jobEditTitle")}</h1>
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
          <Section title={t("employer.secBasicInfo")}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t("employer.jobTitleLabel")} <span className="text-danger-500">*</span>
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
                  {t("employer.jobCategoryLabel")}
                </label>
                <CustomSelect
                  options={(categories as CategoryItem[] | undefined)?.map(cat => ({ value: String(cat.id), label: cat.nameKo })) ?? []}
                  value={categoryId != null ? String(categoryId) : ""}
                  onChange={(v) => setCategoryId(v ? Number(v) : null)}
                  placeholder={t("employer.categoryPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t("employer.requiredCountLabel")}
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
                  {t("employer.jobContentLabel")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("employer.jobContentPlaceholder")}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </Section>

          {/* Section 2 — 지원 방식 */}
          <Section title={t("employer.secAppType")}>
            <div className="flex gap-3">
              {APPLICATION_TYPES.map((appType) => (
                <ToggleCard
                  key={appType.key}
                  icon={appType.icon}
                  label={appType.label}
                  subtitle={appType.subtitle}
                  selected={applicationTypes.includes(appType.key)}
                  onClick={() => toggleApplicationType(appType.key)}
                />
              ))}
            </div>
            {applicationTypes.length === 0 && (
              <p className="text-xs text-danger-500 mt-2">
                {t("employer.selectAtLeastOne")}
              </p>
            )}
          </Section>

          {/* Section 3 — 급여 */}
          <Section title={t("employer.secPayCondition")}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  {t("employer.payTypeLabel")}
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
                <span className="text-sm text-neutral-700">{t("employer.negotiableLabel")}</span>
              </label>

              {!payNegotiable && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      {t("employer.payMinLabel")}
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
                      {t("employer.payMaxLabel")}
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
          <Section title={t("employer.secWorkSchedule")}>
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
                <span className="text-sm text-neutral-700">{t("employer.alwaysOpenLabel")}</span>
              </label>

              {!alwaysOpen && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      {t("employer.startDateLabel")}
                    </label>
                    <DateInput
                      value={startDate}
                      onChange={setStartDate}
                      placeholder={t("employer.startDateLabel")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      {t("employer.endDateLabel")}
                    </label>
                    <DateInput
                      value={endDate}
                      onChange={setEndDate}
                      placeholder={t("employer.endDateLabel")}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Section 5 — 지원 요건 */}
          <Section title={t("employer.secRequirements")}>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  {t("employer.visaConditionLabel")}{" "}
                  <span className="text-neutral-400 font-normal">
                    {t("employer.visaAllAllowed")}
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
                  {t("employer.certRequirementLabel")}
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
                    placeholder={t("employer.certPlaceholder")}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {t("employer.certAddBtn")}
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
                <span className="text-sm text-neutral-700">{t("employer.healthCheckLabel")}</span>
              </label>
            </div>
          </Section>

          {/* Section 6 — 복지 혜택 */}
          <Section title={t("employer.secBenefits")}>
            <div className="flex gap-3">
              <ToggleCard
                icon="🏠"
                label={t("employer.accommodationLabel")}
                selected={accommodationProvided}
                onClick={() => setAccommodationProvided((v) => !v)}
              />
              <ToggleCard
                icon="🍚"
                label={t("employer.mealLabel")}
                selected={mealProvided}
                onClick={() => setMealProvided((v) => !v)}
              />
              <ToggleCard
                icon="🚌"
                label={t("employer.transportationLabel")}
                selected={transportationProvided}
                onClick={() => setTransportationProvided((v) => !v)}
              />
            </div>
          </Section>

          {/* Section 7 — 게시 설정 */}
          <Section title={t("employer.secPublishSettings")}>
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
                  {t("employer.publishDraftLabel")}
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
                  {t("employer.currentlyPublished")}
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
              {t("employer.cancel")}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? t("employer.jobSaving") : t("employer.saveShort")}
            </button>
          </div>

          {updateMutation.isError && (
            <p className="text-xs text-danger-500 mt-2 text-center">
              {(updateMutation.error as Error)?.message ||
                t("employer.jobSaveFailed")}
            </p>
          )}
        </div>

        {/* Delete section */}
        <div className="mt-6 bg-white rounded-lg shadow-card border border-danger-200 p-6">
          <h3 className="text-sm font-semibold text-danger-700 mb-2">
            {t("employer.jobDeleteSectionTitle")}
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            {t("employer.jobDeleteWarning2")}
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteMutation.isPending}
            className="border border-danger-200 text-danger-500 rounded-lg py-2.5 px-5 text-sm font-semibold hover:bg-danger-50 transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? t("employer.jobDeleting") : t("employer.jobDeleteBtn")}
          </button>
        </div>
      </form>
    </div>
  );
}
