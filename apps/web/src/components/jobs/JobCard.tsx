"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Users, User, Building2, Clock, Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { JobSummary } from "@/lib/jobs-api";
import { addJobBookmark, removeJobBookmark } from "@/lib/api";
import { ApplyModal } from "./ApplyModal";
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
  INDIVIDUAL: "개인 지원",
  TEAM: "팀 지원",
  COMPANY: "기업",
};

export function formatPay(min?: number, max?: number, unit?: string, negotiateLabel = "급여 협의"): string {
  const unitLabel = unit ? (PAY_UNIT_LABEL[unit] ?? "") : "";
  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";
  if (!min && !max) return negotiateLabel;
  if (min && max) return `${unitLabel} ${fmt(min)}~${fmt(max)}`;
  return `${unitLabel} ${fmt(min ?? max!)}~`;
}

function getDaysRemaining(endDate?: string): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function CompanyLogo({ logoUrl, companyName }: { logoUrl?: string; companyName: string }) {
  const src = logoUrl || "/images/company-placeholder.svg";
  return (
    <img
      src={src}
      alt={companyName}
      className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
    />
  );
}

// ─── JobCard ──────────────────────────────────────────────────────────────────

export function JobCard({ job, isBookmarked: initialBookmarked }: { job: JobSummary; isBookmarked?: boolean }) {
  const t = useT();
  const queryClient = useQueryClient();
  const daysLeft = getDaysRemaining(job.endDate);
  const isUrgent = !job.alwaysOpen && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isExpired = !job.alwaysOpen && daysLeft !== null && daysLeft < 0;
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [bookmarked, setBookmarked] = React.useState(!!initialBookmarked);

  const bookmarkMutation = useMutation({
    mutationFn: () => bookmarked ? removeJobBookmark(job.publicId) : addJobBookmark(job.publicId),
    onSuccess: (res) => {
      setBookmarked(res.bookmarked);
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
  const appTypeLabel: Record<string, string> = {
    INDIVIDUAL: t("card.individual"),
    TEAM: t("card.team"),
    COMPANY: t("role.employer"),
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white hover:border-primary-200 hover:shadow-card-md transition-all">
      <Link href={`/jobs/${job.publicId}`} className="block p-4">
        {/* Category + Distance row */}
        {(job.categoryName || job.distanceKm !== undefined) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {job.categoryName && (
              <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                {job.categoryName}
              </span>
            )}
            {job.categoryCode && job.categoryHasContent && (
              <Link
                href={`/guides/${job.categoryCode}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-md border border-warning-200 bg-warning-50 px-2 py-0.5 text-[10px] font-medium text-warning-700 hover:bg-warning-100 transition-colors"
              >
                {t("nav.guides")}
              </Link>
            )}
            {job.distanceKm !== undefined && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                <MapPin className="h-3 w-3" />
                {formatDistance(job.distanceKm)}
              </span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3">
          <CompanyLogo logoUrl={job.companyLogoUrl} companyName={job.companyName} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                {job.title}
              </h3>
              <div className="flex flex-shrink-0 items-center gap-1">
                {isUrgent && (
                  <span className="rounded-md bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700">
                    {t("card.urgent")}
                  </span>
                )}
                {/* Bookmark button */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); bookmarkMutation.mutate(); }}
                  disabled={bookmarkMutation.isPending}
                  className={cn(
                    "flex items-center justify-center rounded-full p-1.5 transition-colors disabled:opacity-50",
                    bookmarked
                      ? "bg-pink-50 text-pink-500 hover:bg-pink-100"
                      : "text-neutral-300 hover:text-pink-400 hover:bg-pink-50"
                  )}
                  title={bookmarked ? "찜 취소" : "찜하기"}
                >
                  <Heart className={cn("h-4 w-4", bookmarked && "fill-pink-500 text-pink-500")} />
                </button>
              </div>
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">{job.companyName}</p>
          </div>
        </div>

        {/* Location */}
        {job.sido && (
          <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400">
            <MapPin className="h-3 w-3" />
            {[job.sido, job.sigungu].filter(Boolean).join(" ")}
          </div>
        )}

        {/* Pay */}
        <p className="mt-2 text-sm font-semibold text-primary-500">
          {formatPay(job.payMin, job.payMax, job.payUnit, t("card.negotiate"))}
        </p>

        {/* Welfare chips */}
        {(job.accommodationProvided || job.mealProvided || job.transportationProvided) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.accommodationProvided && (
              <span className="rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
                {t("card.housing")}
              </span>
            )}
            {job.mealProvided && (
              <span className="rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
                {t("card.meals")}
              </span>
            )}
            {job.transportationProvided && (
              <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600">
                {t("card.transport")}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {job.applicationTypes.map((type) => {
              const label = appTypeLabel[type] ?? type;
              const Icon =
                type === "INDIVIDUAL" ? User : type === "TEAM" ? Users : Building2;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {label}
                </span>
              );
            })}
          </div>

          <div className="flex-shrink-0">
            {job.alwaysOpen ? (
              <span className="text-xs font-medium text-success-700">{t("card.always")}</span>
            ) : isExpired ? (
              <span className="text-xs text-neutral-300">{t("card.deadline")}</span>
            ) : daysLeft !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  daysLeft <= 3 ? "text-danger-500" : "text-neutral-400"
                )}
              >
                <Clock className="h-3 w-3" />
                {daysLeft === 0 ? t("card.today") : `D-${daysLeft}`}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Apply button */}
      {!isExpired && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setApplyOpen(true)}
            className="w-full rounded-md bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {t("card.apply")}
          </button>
        </div>
      )}

      <ApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={{ publicId: job.publicId, title: job.title, companyName: job.companyName }}
        onSuccess={() => setApplyOpen(false)}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 h-5 w-20 animate-pulse rounded-md bg-neutral-100" />
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-lg bg-neutral-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
      <div className="mt-3 h-3 w-24 animate-pulse rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-28 animate-pulse rounded bg-neutral-100" />
      <div className="mt-3 flex justify-between">
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100" />
          <div className="h-5 w-12 animate-pulse rounded-full bg-neutral-100" />
        </div>
        <div className="h-3 w-10 animate-pulse rounded bg-neutral-100" />
      </div>
    </div>
  );
}
