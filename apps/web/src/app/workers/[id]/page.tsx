"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Award,
  Briefcase,
  Wrench,
  Calendar,
  Users,
  Shield,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Languages,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getWorker, WorkerPublicProfile } from "@/lib/workers-api";
import { equipmentLabel } from "@/lib/equipment-labels";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Label maps ───────────────────────────────────────────────────────────────

const NATIONALITY_LABELS: Record<string, string> = {
  KR: "한국", VN: "베트남", CN: "중국", PH: "필리핀", ID: "인도네시아",
  TH: "태국", MM: "미얀마", KH: "캄보디아", OTHER: "기타",
};

const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어", vi: "베트남어", en: "영어", zh: "중국어", th: "태국어",
};

const LEVEL_LABELS: Record<string, string> = {
  NATIVE: "원어민", FLUENT: "유창", INTERMEDIATE: "중급", BASIC: "기초",
};

const LEVEL_COLOR: Record<string, string> = {
  NATIVE: "bg-success-50 text-success-700 border-success-200",
  FLUENT: "bg-primary-50 text-primary-600 border-primary-200",
  INTERMEDIATE: "bg-amber-50 text-amber-700 border-amber-200",
  BASIC: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

const PAY_UNIT_LABELS: Record<string, string> = {
  HOURLY: "시급", DAILY: "일급", WEEKLY: "주급", MONTHLY: "월급", LUMP_SUM: "일시불",
};

const HEALTH_CONFIG: Record<string, { className: string; icon: React.ElementType }> = {
  COMPLETED: { className: "bg-success-50 text-success-700 border-success-200", icon: CheckCircle2 },
  NOT_DONE:  { className: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: Clock },
  EXPIRED:   { className: "bg-danger-50 text-danger-600 border-danger-200", icon: AlertCircle },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function formatDate(s?: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function formatPay(min?: number | null, max?: number | null, unit?: string | null): string {
  const u = unit ? PAY_UNIT_LABELS[unit] ?? unit : "";
  if (!min && !max) return "";
  if (min && max) return `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원/${u}`;
  if (min) return `${min.toLocaleString("ko-KR")}원/${u} 이상`;
  return `${max!.toLocaleString("ko-KR")}원/${u} 이하`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-neutral-200", className)} />;
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="h-48 animate-pulse bg-neutral-200" />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-neutral-100 bg-white p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-card-md">
      <div className="flex items-center gap-2 border-b border-neutral-50 px-5 py-4">
        <Icon className="h-4 w-4 text-primary-400" />
        <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Profile Content ──────────────────────────────────────────────────────────

function WorkerProfileContent({ profile }: { profile: WorkerPublicProfile }) {
  const t = useT();
  const health = HEALTH_CONFIG[profile.healthCheckStatus] ?? null;
  const HealthIcon = health?.icon ?? Clock;
  const payLabel = formatPay(profile.desiredPayMin, profile.desiredPayMax, profile.desiredPayUnit);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-10">
      {/* ── Hero ── */}
      <div className="relative -mx-4 sm:-mx-6">
        <div className="h-32 w-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          {profile.profileImageUrl ? (
            <img
              src={profile.profileImageUrl}
              alt={profile.fullName}
              className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-primary-400 text-3xl font-bold text-white shadow-lg">
              {getInitials(profile.fullName)}
            </div>
          )}
        </div>
      </div>

      {/* ── Name + badges ── */}
      <div className="mt-12 mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h1 className="text-2xl font-extrabold text-neutral-950">{profile.fullName}</h1>
          {profile.isTeamLeader && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-warning-100 px-2.5 py-0.5 text-xs font-semibold text-warning-700">
              <Shield className="h-3 w-3" /> {t("worker.leaderBadge")}
            </span>
          )}
          {!profile.isTeamLeader && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
              <Users className="h-3 w-3" /> {t("worker.memberBadge")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">
            {t(`nationality.${profile.nationality}` as any) ?? NATIONALITY_LABELS[profile.nationality] ?? profile.nationality}
            {profile.visaType && ` · ${profile.visaType}`}
          </span>
          {health && (
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", health.className)}>
              <HealthIcon className="h-3 w-3" />
              {t(`worker.health.${profile.healthCheckStatus}` as any)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* ── 소개 ── */}
        {profile.bio && (
          <SectionCard title={t("worker.bio")} icon={Globe} empty={!profile.bio}>
            <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">{profile.bio}</p>
          </SectionCard>
        )}

        {/* ── 기본 정보 ── */}
        <SectionCard title={t("worker.basicInfo")} icon={Shield}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="mb-1 text-xs text-neutral-400">{t("worker.nationality")}</p>
              <p className="text-sm font-semibold text-neutral-900">
                {t(`nationality.${profile.nationality}` as any) ?? NATIONALITY_LABELS[profile.nationality] ?? profile.nationality}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-neutral-400">{t("worker.visa")}</p>
              <p className="text-sm font-semibold text-neutral-900">{profile.visaType || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-neutral-400">{t("worker.health")}</p>
              {health ? (
                <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", health.className)}>
                  <HealthIcon className="h-3 w-3" />
                  {t(`worker.health.${profile.healthCheckStatus}` as any)}
                </span>
              ) : <p className="text-sm text-neutral-400">—</p>}
            </div>
            {payLabel && (
              <div>
                <p className="mb-1 text-xs text-neutral-400">{t("worker.desiredPay")}</p>
                <p className="text-sm font-semibold text-neutral-900">{payLabel}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── 언어 능력 ── */}
        <SectionCard
          title={`${t("worker.languages")} (${profile.languages.length})`}
          icon={Languages}
          empty={profile.languages.length === 0}
        >
          <div className="space-y-3">
            {profile.languages.map((lang, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-800">
                  {LANGUAGE_LABELS[lang.code] ?? lang.code}
                </span>
                <span className={cn("rounded-md border px-2.5 py-0.5 text-xs font-semibold", LEVEL_COLOR[lang.level] ?? "bg-neutral-50 text-neutral-500 border-neutral-200")}>
                  {LEVEL_LABELS[lang.level] ?? lang.level}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 자격증 ── */}
        <SectionCard
          title={`${t("worker.certifications")} (${profile.certifications.length})`}
          icon={Award}
          empty={profile.certifications.length === 0}
        >
          <div className="space-y-3">
            {profile.certifications.map((cert, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{cert.name}</p>
                  {cert.issueDate && (
                    <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      취득일: {formatDate(cert.issueDate)}
                    </p>
                  )}
                  {cert.expiryDate && (
                    <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      만료일: {formatDate(cert.expiryDate)}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 보유 장비 ── */}
        <SectionCard
          title={`${t("worker.equipment")} (${profile.equipment.length})`}
          icon={Wrench}
          empty={profile.equipment.length === 0}
        >
          <div className="flex flex-wrap gap-2">
            {profile.equipment.map((eq, i) => (
              <span key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700">
                {equipmentLabel(eq)}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* ── 포트폴리오 ── */}
        <SectionCard
          title={`${t("worker.portfolio")} (${profile.portfolio.length})`}
          icon={Calendar}
          empty={profile.portfolio.length === 0}
        >
          <div className="space-y-4">
            {profile.portfolio.map((item, i) => (
              <div key={i} className="rounded-lg border border-neutral-100 p-4">
                <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                {(item.startDate || item.endDate) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(item.startDate)}
                    {item.endDate ? ` ~ ${formatDate(item.endDate)}` : ""}
                  </p>
                )}
                {item.description && (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
                )}
                {item.imageUrls?.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {item.imageUrls.map((url, j) => (
                      <img
                        key={j}
                        src={url}
                        alt=""
                        className="h-24 w-32 flex-shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 소속 팀 ── */}
        {profile.teamPublicId && (
          <SectionCard title={t("worker.team")} icon={Users}>
            <Link
              href={`/teams/${profile.teamPublicId}`}
              className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3.5 transition-colors hover:bg-primary-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500">
                  {profile.isTeamLeader
                    ? <Shield className="h-5 w-5 text-white" />
                    : <Users className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-primary-700">{profile.teamName}</p>
                  <p className="text-xs text-primary-500">{profile.isTeamLeader ? t("worker.leaderBadge") : t("worker.memberBadge")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary-400" />
            </Link>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function WorkerProfilePage({ id }: { id: string }) {
  const t = useT();
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["worker-profile", id],
    queryFn: () => getWorker(id),
  });

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <AlertCircle className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-base font-bold text-neutral-700">{t("worker.loadError")}</p>
        <Link
          href="/teams"
          className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          팀 찾기로
        </Link>
      </div>
    );
  }

  return <WorkerProfileContent profile={profile} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  return (
    <AppLayout>
      {/* Back button bar */}
      <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="#"
            onClick={(e) => { e.preventDefault(); window.history.back(); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <h1 className="text-sm font-bold text-neutral-900">프로필</h1>
        </div>
      </div>

      <WorkerProfilePage id={id} />
    </AppLayout>
  );
}
