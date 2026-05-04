"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  User,
  Building2,
  Clock,
  Eye,
  FileText,
  Shield,
  CheckCircle2,
  ChevronLeft,
  AlertCircle,
  Calendar,
  Utensils,
  Home,
  Bus,
  Hammer,
  Phone,
  Globe,
  Tag,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useJobDetail } from "@/hooks/useJobs";
import { useAuthStore } from "@/store/authStore";
import { formatPay } from "@/components/jobs/JobCard";
import { ApplyModal } from "@/components/jobs/ApplyModal";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAY_UNIT_LABEL: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
  LUMP_SUM: "일시불",
};

const APP_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "개인",
  TEAM: "팀",
  COMPANY: "기업",
};

const SITE_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PLANNING:  { label: "착공 예정", cls: "bg-primary-50 text-primary-700" },
  ACTIVE:    { label: "공사 중",   cls: "bg-success-50 text-success-700" },
  COMPLETED: { label: "공사 완료", cls: "bg-neutral-100 text-neutral-600" },
  SUSPENDED: { label: "중단",      cls: "bg-danger-50 text-danger-700" },
};

function AppTypeBadge({ type }: { type: string }) {
  const t = useT();
  const appLabel: Record<string, string> = {
    INDIVIDUAL: t("job.appType.INDIVIDUAL"),
    TEAM: t("job.appType.TEAM"),
    COMPANY: t("job.appType.COMPANY"),
  };
  const label = appLabel[type] ?? type;
  const Icon =
    type === "INDIVIDUAL" ? User : type === "TEAM" ? Users : Building2;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/20 bg-primary-500/5 px-3 py-1 text-sm font-medium text-primary-500">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-800">
      <Icon className="h-4 w-4 text-primary-500 flex-shrink-0" />
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-neutral-50 last:border-0">
      <span className="text-neutral-400 flex-shrink-0 w-20">{label}</span>
      <span className="font-medium text-neutral-800 text-right">{value}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function JobDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 h-5 w-24 animate-pulse rounded bg-neutral-200" />
      <div className="rounded-lg border border-neutral-100 bg-white p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 animate-pulse rounded-lg bg-neutral-200" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-neutral-100" style={{ width: `${70 + Math.random() * 25}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Detail content ────────────────────────────────────────────────────────────

function JobDetailContent({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: job, isLoading, isError } = useJobDetail(id);
  const [applyOpen, setApplyOpen] = React.useState(false);

  const handleApply = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setApplyOpen(true);
  };

  const payUnitLabel: Record<string, string> = {
    HOURLY: t("job.payType.HOURLY"),
    DAILY: t("job.payType.DAILY"),
    WEEKLY: t("job.payType.WEEKLY"),
    MONTHLY: t("job.payType.MONTHLY"),
    LUMP_SUM: t("job.payType.LUMP_SUM"),
  };
  const siteStatusLabel: Record<string, { label: string; cls: string }> = {
    PLANNING:  { label: t("job.siteStatus.PLANNED"),    cls: "bg-primary-50 text-primary-700" },
    ACTIVE:    { label: t("job.siteStatus.ONGOING"),    cls: "bg-success-50 text-success-700" },
    COMPLETED: { label: t("job.siteStatus.COMPLETED"),  cls: "bg-neutral-100 text-neutral-600" },
    SUSPENDED: { label: t("job.siteStatus.SUSPENDED"),  cls: "bg-danger-50 text-danger-700" },
  };

  if (isLoading) return <JobDetailSkeleton />;

  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <FileText className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-base font-bold text-neutral-700">{t("jobs.loadError")}</p>
        <button
          onClick={() => router.push("/jobs")}
          className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("job.back")}
        </button>
      </div>
    );
  }

  const daysLeft = job.endDate
    ? Math.ceil((new Date(job.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const hasRequirements =
    job.visaRequirements?.length > 0 ||
    job.certificationRequirements?.length > 0 ||
    job.healthCheckRequired;

  const hasWelfare = job.accommodationProvided || job.mealProvided || job.transportationProvided;

  const siteStatus = job.site?.status ? siteStatusLabel[job.site.status] : null;

  // Company display name — prefer site.companyName over job.companyName fallback
  const companyName = job.site?.companyName || job.companyName;
  const companyLogoUrl = job.site?.companyLogoUrl || job.companyLogoUrl || "/images/company-placeholder.svg";

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:flex lg:gap-8">
        {/* ── Main column ── */}
        <div className="flex-1 space-y-4">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("job.back")}
          </button>

          {/* ─ Hero header ─ */}
          <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
            <div className="flex items-start gap-4">
              <img
                src={companyLogoUrl}
                alt={companyName}
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold leading-tight text-neutral-950">
                  {job.title}
                </h1>
                <p className="mt-0.5 font-semibold text-neutral-600">{companyName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {(job.sido ?? job.site?.sido) && (
                    <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                      <MapPin className="h-3.5 w-3.5 text-primary-500" />
                      {[job.sido ?? job.site?.sido, job.sigungu ?? job.site?.sigungu]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                  )}
                  {job.categoryName && (
                    <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
                      <Tag className="h-3.5 w-3.5" />
                      {job.categoryName}
                    </span>
                  )}
                  {job.publishedAt && (
                    <span className="text-sm text-neutral-400">
                      {formatDate(job.publishedAt)} 등록
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─ Key stats ─ */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("job.salary")}</p>
              <p className="mt-1 text-sm font-bold text-primary-500">
                {formatPay(job.payMin, job.payMax, job.payUnit, t("card.negotiate"))}
              </p>
              {job.payUnit && (
                <p className="mt-0.5 text-[10px] text-neutral-400">{payUnitLabel[job.payUnit]} {t("job.basis")}</p>
              )}
            </div>
            <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("job.recruit")}</p>
              <p className="mt-1 text-sm font-bold text-neutral-900">
                {job.requiredCount != null ? `${job.requiredCount}${t("job.persons")}` : t("job.undecided")}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("job.deadline")}</p>
              <p className={cn(
                "mt-1 text-sm font-bold",
                job.alwaysOpen ? "text-success-700"
                  : daysLeft !== null && daysLeft <= 7 ? "text-danger-500"
                  : "text-neutral-900"
              )}>
                {job.alwaysOpen ? t("job.always") : job.endDate ? formatDate(job.endDate) : t("job.undecided")}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("job.views")}</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-bold text-neutral-900">
                <Eye className="h-3.5 w-3.5 text-neutral-400" />
                {job.viewCount.toLocaleString("ko-KR")}
              </p>
            </div>
          </div>

          {/* ─ 근무 기간 ─ */}
          {(job.startDate || job.endDate) && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <SectionTitle icon={Calendar}>{t("job.workPeriod")}</SectionTitle>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg bg-neutral-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{t("job.startDate")}</p>
                  <p className="text-sm font-bold text-neutral-900">{job.startDate ? formatDate(job.startDate) : t("job.undecided")}</p>
                </div>
                <span className="text-neutral-300 text-lg">→</span>
                <div className="flex-1 rounded-lg bg-neutral-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{t("job.endDate")}</p>
                  <p className="text-sm font-bold text-neutral-900">{job.endDate ? formatDate(job.endDate) : t("job.undecided")}</p>
                </div>
              </div>
            </div>
          )}

          {/* ─ 복지 혜택 ─ */}
          {hasWelfare && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <SectionTitle icon={CheckCircle2}>{t("job.welfare")}</SectionTitle>
              <div className="flex flex-wrap gap-3">
                {job.accommodationProvided && (
                  <div className="flex items-center gap-2 rounded-lg bg-success-50 px-4 py-2.5">
                    <Home className="h-4 w-4 text-success-700" />
                    <span className="text-sm font-semibold text-success-700">{t("job.housing")}</span>
                  </div>
                )}
                {job.mealProvided && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2.5">
                    <Utensils className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-semibold text-primary-500">{t("job.meals")}</span>
                  </div>
                )}
                {job.transportationProvided && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2.5">
                    <Bus className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-semibold text-blue-800">{t("job.transport")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ 지원 유형 ─ */}
          <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
            <SectionTitle icon={Users}>{t("job.applyType")}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {job.applicationTypes.map((t) => (
                <AppTypeBadge key={t} type={t} />
              ))}
            </div>
          </div>

          {/* ─ 공고 내용 ─ */}
          {job.description && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <SectionTitle icon={FileText}>{t("job.description")}</SectionTitle>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700">
                {job.description}
              </pre>
            </div>
          )}

          {/* ─ 자격 요건 ─ */}
          {hasRequirements && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <SectionTitle icon={Shield}>{t("job.requirements")}</SectionTitle>
              <div className="space-y-4">
                {job.visaRequirements?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-neutral-500">{t("job.visaReq")}</p>
                    <div className="flex flex-wrap gap-2">
                      {job.visaRequirements.map((v) => (
                        <span key={v} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {job.certificationRequirements?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-neutral-500">{t("job.certs")}</p>
                    <div className="flex flex-col gap-1.5">
                      {job.certificationRequirements.map((c) => (
                        <span key={c} className="flex items-center gap-2 text-sm text-neutral-700">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary-500" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {job.healthCheckRequired && (
                  <div className="flex items-center gap-2 rounded-lg bg-warning-50 px-4 py-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-warning-700" />
                    <p className="text-sm font-medium text-warning-700">{t("job.healthCheck")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ 건설 현장 정보 ─ */}
          {job.site && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <SectionTitle icon={Hammer}>{t("job.siteInfo")}</SectionTitle>
              <div className="space-y-4">
                {/* Site header */}
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    <Hammer className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-neutral-900 text-base">{job.site.name}</p>
                      {siteStatus && (
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", siteStatus.cls)}>
                          {siteStatus.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {job.site.address}
                      {job.site.addressDetail && ` ${job.site.addressDetail}`}
                    </p>
                  </div>
                </div>

                {/* Site details */}
                <div className="rounded-lg bg-neutral-50 px-4 py-3 space-y-0">
                  <InfoRow label={t("job.region")} value={[job.site.sido, job.site.sigungu].filter(Boolean).join(" ") || undefined} />
                  {job.site.startDate && (
                    <InfoRow label={t("job.startedOn")} value={formatDate(job.site.startDate)} />
                  )}
                  {job.site.endDate && (
                    <InfoRow label={t("job.completionDate")} value={formatDate(job.site.endDate)} />
                  )}
                </div>

                {/* Site description */}
                {job.site.description && (
                  <p className="text-sm leading-relaxed text-neutral-600">{job.site.description}</p>
                )}

                {/* Map placeholder */}
                <div className="flex h-36 items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-400">
                  <div className="text-center">
                    <MapPin className="mx-auto mb-2 h-6 w-6" />
                    {job.site.latitude && job.site.longitude ? (
                      <p className="text-xs">{job.site.latitude.toFixed(5)}, {job.site.longitude.toFixed(5)}</p>
                    ) : null}
                    <p className="mt-1 text-xs">{t("job.mapPending")}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─ 건설사 정보 ─ */}
          {(job.site?.companyName || job.companyName) && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <SectionTitle icon={Building2}>{t("job.companyInfo")}</SectionTitle>
              <div className="flex items-start gap-3 mb-4">
                <img src={companyLogoUrl} alt={companyName} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                <div>
                  <p className="font-bold text-neutral-900 text-base">{companyName}</p>
                  {job.site?.companyBusinessNumber && (
                    <p className="text-xs text-neutral-400 mt-0.5">{t("job.bizNo")} {job.site.companyBusinessNumber}</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-neutral-50 px-4 py-3 space-y-0">
                <InfoRow
                  label={t("job.contact")}
                  value={job.site?.companyPhone ? (
                    <a href={`tel:${job.site.companyPhone}`} className="flex items-center gap-1 text-primary-500 hover:underline">
                      <Phone className="h-3.5 w-3.5" />
                      {job.site.companyPhone}
                    </a>
                  ) : undefined}
                />
                <InfoRow label={t("job.address")} value={job.site?.companyAddress} />
                <InfoRow
                  label={t("job.website")}
                  value={job.site?.companyWebsite ? (
                    <a href={job.site.companyWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-500 hover:underline">
                      <Globe className="h-3.5 w-3.5" />
                      {t("job.websiteLink")}
                    </a>
                  ) : undefined}
                />
              </div>
              {job.site?.companyDescription && (
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{job.site.companyDescription}</p>
              )}
            </div>
          )}

          <div className="h-4 lg:hidden" />
        </div>

        {/* ── Desktop CTA sidebar ── */}
        <aside className="hidden w-72 flex-shrink-0 lg:block">
          <div className="sticky top-[80px] space-y-3">
            {/* Apply card */}
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
              <p className="mb-0.5 text-lg font-extrabold text-neutral-950">{job.title}</p>
              <p className="mb-4 text-sm text-neutral-500">{companyName}</p>
              <p className="mb-1 text-2xl font-extrabold text-primary-500">
                {formatPay(job.payMin, job.payMax, job.payUnit, t("card.negotiate"))}
              </p>
              <p className="mb-5 text-xs text-neutral-400">
                {job.payUnit ? payUnitLabel[job.payUnit] : ""} {t("job.basis")}
              </p>
              <div className="mb-4 flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                <span className="flex justify-between">
                  <span>{t("job.deadline")}</span>
                  <span className="font-semibold text-neutral-800">
                    {job.alwaysOpen ? t("job.always") : job.endDate ? formatDate(job.endDate) : t("job.undecided")}
                  </span>
                </span>
                <span className="flex justify-between">
                  <span>{t("job.applicants")}</span>
                  <span className="font-semibold text-neutral-800">{job.applicationCount.toLocaleString("ko-KR")}{t("job.persons")}</span>
                </span>
                {job.requiredCount != null && (
                  <span className="flex justify-between">
                    <span>{t("job.recruit")}</span>
                    <span className="font-semibold text-neutral-800">{job.requiredCount}{t("job.persons")}</span>
                  </span>
                )}
              </div>
              <button
                onClick={handleApply}
                className="w-full rounded-lg bg-primary-500 py-3.5 text-base font-bold text-white hover:bg-primary-600 hover:shadow-md active:scale-[0.98] transition-all"
              >
                {t("job.apply")}
              </button>
            </div>

            {/* Welfare mini card */}
            {hasWelfare && (
              <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card">
                <p className="mb-3 text-xs font-bold text-neutral-600 uppercase tracking-wide">{t("job.welfare")}</p>
                <div className="flex flex-wrap gap-2">
                  {job.accommodationProvided && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-2.5 py-1.5 text-xs font-semibold text-success-700">
                      <Home className="h-3.5 w-3.5" /> {t("job.housing")}
                    </span>
                  )}
                  {job.mealProvided && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700">
                      <Utensils className="h-3.5 w-3.5" /> {t("job.meals")}
                    </span>
                  )}
                  {job.transportationProvided && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700">
                      <Bus className="h-3.5 w-3.5" /> {t("job.transport")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Site mini card */}
            {job.site && (
              <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card">
                <p className="mb-2 text-xs font-bold text-neutral-600 uppercase tracking-wide">{t("job.siteLocation")}</p>
                <p className="text-sm font-semibold text-neutral-800">{job.site.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {[job.site.sido, job.site.sigungu].filter(Boolean).join(" ") || job.site.address}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-100 bg-white/95 px-4 pt-3 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 60px)` }}
      >
        <button
          onClick={handleApply}
          className="w-full rounded-lg bg-primary-500 py-4 text-base font-bold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
        >
          {t("job.apply")}
        </button>
      </div>

      {job && (
        <ApplyModal
          isOpen={applyOpen}
          onClose={() => setApplyOpen(false)}
          job={{ publicId: job.publicId, title: job.title, companyName: companyName ?? "" }}
          onSuccess={() => setApplyOpen(false)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  return (
    <AppLayout>
      <JobDetailContent id={id} />
    </AppLayout>
  );
}
