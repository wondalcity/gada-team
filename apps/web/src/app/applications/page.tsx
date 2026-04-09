"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Star, BadgeCheck, X, ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getMyApplications,
  withdrawApplication,
  type ApplicationSummary,
  type ApplicationStatus,
} from "@/lib/applications-api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TabKey =
  | "ALL"
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SHORTLISTED_INTERVIEW"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";


const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-neutral-100 text-neutral-600",
  UNDER_REVIEW: "bg-primary-100 text-primary-700",
  SHORTLISTED: "bg-secondary-100 text-secondary-600",
  INTERVIEW_PENDING: "bg-secondary-100 text-secondary-600",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-danger-100 text-danger-700",
  HIRED: "bg-success-100 text-success-700",
  WITHDRAWN: "bg-neutral-100 text-neutral-400",
};

const APP_TYPE_BADGE: Record<string, string> = {
  INDIVIDUAL: "bg-primary-500/8 text-primary-500",
  TEAM: "bg-success-50 text-success-700",
  COMPANY: "bg-secondary-50 text-secondary-600",
};

function matchesTab(status: ApplicationStatus, tab: TabKey): boolean {
  if (tab === "ALL") return true;
  if (tab === "APPLIED") return status === "APPLIED";
  if (tab === "UNDER_REVIEW") return status === "UNDER_REVIEW";
  if (tab === "SHORTLISTED_INTERVIEW")
    return status === "SHORTLISTED" || status === "INTERVIEW_PENDING";
  if (tab === "HIRED") return status === "HIRED";
  if (tab === "REJECTED") return status === "REJECTED";
  if (tab === "WITHDRAWN") return status === "WITHDRAWN";
  return false;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ApplicationCardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-neutral-200 rounded" />
          <div className="h-3 w-1/3 bg-neutral-100 rounded" />
        </div>
        <div className="h-5 w-16 bg-neutral-200 rounded-full" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-5 w-10 bg-neutral-100 rounded-full" />
        <div className="h-3 w-24 bg-neutral-100 rounded" />
      </div>
      <div className="mt-3 h-8 bg-neutral-100 rounded-lg" />
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function WithdrawConfirmDialog({
  open,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useT();
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
          <h3 className="text-base font-bold text-neutral-950">{t("app.cancelBtn")}</h3>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            {t("app.cancelConfirm")}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              {t("app.cancelNo")}
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 rounded-lg bg-danger-500 py-2.5 text-sm font-semibold text-white hover:bg-danger-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? t("common.processing") : t("app.cancelYes")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Application card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onWithdraw,
}: {
  app: ApplicationSummary;
  onWithdraw: (publicId: string) => void;
}) {
  const t = useT();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawApplication(app.publicId),
    onMutate: async () => {
      // Optimistic update: mark as WITHDRAWN in cache
      await queryClient.cancelQueries({ queryKey: ["myApplications"] });
      const snapshots = queryClient.getQueriesData<{
        content: ApplicationSummary[];
      }>({ queryKey: ["myApplications"] });

      snapshots.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, {
          ...data,
          content: data.content.map((a) =>
            a.publicId === app.publicId
              ? { ...a, status: "WITHDRAWN" as ApplicationStatus }
              : a
          ),
        });
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      setConfirmOpen(false);
    },
  });

  const badgeClassName = STATUS_BADGE_CLASS[app.status];
  const badgeText = t(`app.status.${app.status}` as any);
  const typeBadgeCls =
    APP_TYPE_BADGE[app.applicationType] ??
    "bg-neutral-100 text-neutral-600";
  const typeLabel = t(`app.appType.${app.applicationType}` as any);
  const canWithdraw = app.status === "APPLIED";

  return (
    <>
      <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card transition-all hover:border-primary-500/20 hover:shadow-card-md">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/jobs/${app.jobPublicId}`}
              className="block text-sm font-bold text-neutral-950 hover:text-primary-500 transition-colors line-clamp-1"
            >
              {app.jobTitle}
            </Link>
            <p className="mt-0.5 text-xs text-neutral-500">{app.companyName}</p>
          </div>

          {/* Status badge */}
          <span
            className={cn(
              "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
              badgeClassName
            )}
          >
            {badgeText}
          </span>
        </div>

        {/* Second row — type + badges + date */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              typeBadgeCls
            )}
          >
            {typeLabel}
          </span>

          {app.isScouted && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700 border border-warning-200">
              <Star className="h-2.5 w-2.5" />
              {t("app.isScout")}
            </span>
          )}

          {app.isVerified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 border border-primary-200">
              <BadgeCheck className="h-2.5 w-2.5" />
              {t("app.isCertified")}
            </span>
          )}

          <span className="ml-auto flex-shrink-0 text-xs text-neutral-400">
            {t("app.appliedAt")} {formatDate(app.appliedAt)}
          </span>
        </div>

        {/* Withdraw button */}
        {canWithdraw && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full rounded-lg border border-danger-200 py-2 text-xs font-semibold text-danger-500 hover:bg-danger-50 transition-colors"
            >
              {t("app.cancelBtn")}
            </button>
          </div>
        )}
      </div>

      <WithdrawConfirmDialog
        open={confirmOpen}
        onConfirm={() => withdrawMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        isPending={withdrawMutation.isPending}
      />
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-100 bg-white py-20 text-center">
      <FileText className="mb-4 h-12 w-12 text-neutral-300" />
      <p className="text-base font-bold text-neutral-700">
        {tab === "ALL" ? t("app.empty") : t("app.emptyStatus")}
      </p>
      <p className="mt-1.5 text-sm text-neutral-500">
        {t("app.emptySub")}
      </p>
      <Link
        href="/jobs"
        className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
      >
        {t("app.browseJobs")}
      </Link>
    </div>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function ApplicationsContent() {
  const t = useT();
  const [tab, setTab] = React.useState<TabKey>("ALL");
  const [page, setPage] = React.useState(0);

  const TABS_WITH_LABELS = [
    { key: "ALL" as TabKey, label: t("app.filterAll") },
    { key: "APPLIED" as TabKey, label: t("app.filterApplied") },
    { key: "UNDER_REVIEW" as TabKey, label: t("app.filterReview") },
    { key: "HIRED" as TabKey, label: t("app.filterPass") },
    { key: "REJECTED" as TabKey, label: t("app.filterFail") },
    { key: "WITHDRAWN" as TabKey, label: t("app.filterCanceled") },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myApplications", page],
    queryFn: () => getMyApplications(page),
    throwOnError: false,
    retry: false,
  });

  const allApps = data?.content ?? [];
  const filteredApps = allApps.filter((a) => matchesTab(a.status, tab));
  const totalPages = data?.totalPages ?? 1;

  const handleTabChange = (key: TabKey) => {
    setTab(key);
    setPage(0);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-neutral-950">{t("app.title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("app.totalApplied", data?.totalElements ?? 0)}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1 w-fit min-w-max">
          {TABS_WITH_LABELS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => handleTabChange(tabItem.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
                tab === tabItem.key
                  ? "bg-white text-neutral-900 shadow-card"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <ApplicationCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-neutral-100 bg-white p-10 text-center">
          <p className="text-sm text-neutral-500">
            {t("common.error")}. {t("common.retry")}
          </p>
        </div>
      ) : filteredApps.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredApps.map((app) => (
            <ApplicationCard
              key={app.publicId}
              app={app}
              onWithdraw={() => {}}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("app.prevPage")}
          </button>
          <span className="text-sm text-neutral-500 px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t("app.nextPage")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  return (
    <AppLayout>
      <ApplicationsContent />
    </AppLayout>
  );
}
