"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  employerApi,
  type SiteResponse,
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

// ─── Site selector ────────────────────────────────────────────────

function SiteSelector({
  sites,
  selectedId,
  onSelect,
}: {
  sites: SiteResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useT();

  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 text-sm mb-4">
          {t("employer.siteNotRegistered")}
        </p>
        <a
          href="/employer/company"
          className="inline-block bg-primary-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          {t("employer.goRegisterSite")}
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sites.map((site) => {
        const isSelected = selectedId === site.publicId;
        return (
          <button
            key={site.publicId}
            type="button"
            onClick={() => onSelect(site.publicId)}
            className={`relative text-left p-4 rounded-lg border-2 transition-all ${
              isSelected
                ? "border-primary-500 bg-primary-50"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            {isSelected && (
              <span className="absolute top-3 right-3 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs">
                ✓
              </span>
            )}
            <p className="font-semibold text-neutral-900 text-sm pr-6">
              {site.name}
            </p>
            {site.address && (
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                {site.address}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {site.sido && (
                <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                  {site.sido}
                </span>
              )}
              {site.sigungu && (
                <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                  {site.sigungu}
                </span>
              )}
              <span className="text-xs text-neutral-400">
                {t("employer.siteJobCount", site.activeJobCount)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
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

// ─── Form ─────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter();
  const t = useT();
  const APPLICATION_TYPES = getApplicationTypes(t);
  const PAY_UNITS = getPayUnits(t);
  const VISA_TYPES = getVisaTypes(t);

  // Step
  const [siteSelected, setSiteSelected] = useState(false);
  const [sitePublicId, setSitePublicId] = useState<string | null>(null);

  // Section 1 — 기본 정보
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [requiredCount, setRequiredCount] = useState(1);

  // Section 2 — 지원 방식
  const [applicationTypes, setApplicationTypes] = useState<string[]>([
    "INDIVIDUAL",
    "TEAM",
    "COMPANY",
  ]);

  // Section 3 — 급여
  const [payUnit, setPayUnit] = useState("DAILY");
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [payNegotiable, setPayNegotiable] = useState(false);

  // Section 4 — 근무 일정
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Section 5 — 요건
  const [visaRequirements, setVisaRequirements] = useState<string[]>([]);
  const [certInput, setCertInput] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [healthCheckRequired, setHealthCheckRequired] = useState(false);

  // Section 6 — 복지
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [mealProvided, setMealProvided] = useState(false);
  const [transportationProvided, setTransportationProvided] = useState(false);

  // Section 7 — 게시 설정
  const [publishStatus, setPublishStatus] = useState<"DRAFT" | "PUBLISHED">(
    "PUBLISHED"
  );

  // Description
  const [description, setDescription] = useState("");

  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch data
  const { data: company } = useQuery({
    queryKey: ["employer", "company"],
    queryFn: () => employerApi.getMyCompany(),
    throwOnError: false,
    retry: false,
  });

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["employer", "sites", company?.publicId],
    queryFn: () => employerApi.getMySites(company!.publicId),
    enabled: !!company?.publicId,
    throwOnError: false,
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => employerApi.getCategories(),
    throwOnError: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateJobPayload) => employerApi.createJob(payload),
    onSuccess: () => {
      router.push("/employer/jobs");
    },
  });

  const selectedSite = sites?.find((s) => s.publicId === sitePublicId);

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

  const handleSiteSelect = (id: string) => {
    setSitePublicId(id);
  };

  const handleContinue = () => {
    if (!sitePublicId) return;
    setSiteSelected(true);
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
    if (!sitePublicId) {
      setValidationError(t("employer.siteRequired"));
      return;
    }

    setValidationError(null);

    const payload: CreateJobPayload = {
      sitePublicId,
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
    };

    createMutation.mutate(payload);
  };

  const inputClass =
    "w-full border border-neutral-200 rounded-lg px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 bg-white";

  // ── Site selection step ──

  if (!siteSelected) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-xs text-neutral-500 hover:text-neutral-700 mb-2 flex items-center gap-1"
          >
            {t("employer.back")}
          </button>
          <h1 className="text-xl font-extrabold text-neutral-950">{t("employer.jobPostTitle")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {t("employer.siteSelectDesc")}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-card-md p-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            {t("employer.selectSiteTitle")}
          </h2>
          {sitesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-neutral-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <SiteSelector
              sites={sites ?? []}
              selectedId={sitePublicId}
              onSelect={handleSiteSelect}
            />
          )}

          {sitePublicId && (
            <div className="mt-6">
              <button
                onClick={handleContinue}
                className="w-full bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors"
              >
                {t("employer.nextStep")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main form ──

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Form area */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-w-0"
      >
        {/* Context bar */}
        <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <span className="text-xs text-neutral-500">
            {company?.name ?? "회사"}
          </span>
          <span className="text-neutral-300">›</span>
          <span className="text-xs font-semibold text-neutral-900">
            {selectedSite?.name ?? "현장"}
          </span>
          <button
            type="button"
            onClick={() => setSiteSelected(false)}
            className="ml-auto text-xs text-primary-500 font-semibold hover:underline"
          >
            {t("employer.changeSite")}
          </button>
        </div>

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
                <span className="text-xs text-neutral-500">
                  {t("employer.publishDraftDesc")}
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
                  {t("employer.publishNowLabel")}
                </span>
                <span className="text-xs text-neutral-500">
                  {t("employer.publishNowDesc")}
                </span>
              </button>
            </div>
          </Section>

          {/* Submit */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending
                ? t("employer.jobPosting")
                : publishStatus === "DRAFT"
                ? t("employer.publishDraftLabel")
                : t("employer.jobPostBtn")}
            </button>
            {createMutation.isError && (
              <p className="text-xs text-danger-500 mt-2 text-center">
                {(createMutation.error as Error)?.message ||
                  t("employer.jobPostFailed")}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Desktop sidebar — preview */}
      <div className="hidden lg:block w-64 shrink-0 sticky top-20">
        <div className="bg-white rounded-lg shadow-card-md p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            {t("employer.jobPreviewTitle")}
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-neutral-400">{t("employer.previewTitleLabel")}</p>
              <p className="text-sm font-semibold text-neutral-900 mt-0.5">
                {title || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t("employer.previewSiteLabel")}</p>
              <p className="text-sm text-neutral-700 mt-0.5">
                {selectedSite?.name ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t("employer.previewPayLabel")}</p>
              <p className="text-sm text-neutral-700 mt-0.5">
                {payNegotiable
                  ? t("employer.negotiateShort")
                  : payMin || payMax
                  ? `${payMin ? Number(payMin).toLocaleString("ko-KR") + "원" : ""}${payMin && payMax ? " ~ " : ""}${payMax ? Number(payMax).toLocaleString("ko-KR") + "원" : ""}`
                  : t("employer.noInputLabel")}
                {" "}
                {PAY_UNITS.find((u) => u.key === payUnit)?.label ?? ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t("employer.previewHeadcountLabel")}</p>
              <p className="text-sm text-neutral-700 mt-0.5">
                {requiredCount}명
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t("employer.previewBenefitsLabel")}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {accommodationProvided && (
                  <span className="text-xs bg-primary-50 text-primary-500 px-2 py-0.5 rounded-full">
                    🏠 {t("employer.accommodationLabel")}
                  </span>
                )}
                {mealProvided && (
                  <span className="text-xs bg-primary-50 text-primary-500 px-2 py-0.5 rounded-full">
                    🍚 {t("employer.mealLabel")}
                  </span>
                )}
                {transportationProvided && (
                  <span className="text-xs bg-primary-50 text-primary-500 px-2 py-0.5 rounded-full">
                    🚌 {t("employer.transportationLabel")}
                  </span>
                )}
                {!accommodationProvided &&
                  !mealProvided &&
                  !transportationProvided && (
                    <span className="text-xs text-neutral-400">{t("employer.noCountLabel")}</span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile — fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-3 z-20">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 truncate">
              {title || t("employer.jobTitleNoInput")}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {selectedSite?.name ?? ""}
              {categoryId &&
              (categories as CategoryItem[] | undefined)?.find(
                (c) => c.id === categoryId
              )
                ? ` · ${(categories as CategoryItem[]).find((c) => c.id === categoryId)?.nameKo}`
                : ""}
            </p>
          </div>
          <button
            type="submit"
            form="job-form"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
            className="bg-primary-500 text-white rounded-lg py-2.5 px-5 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {t("employer.jobPostBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
