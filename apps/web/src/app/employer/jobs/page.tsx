"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { employerApi, type JobSummary } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────

type TabKey = "ALL" | "PUBLISHED" | "DRAFT" | "CLOSED";

function statusBadge(status: string, t: ReturnType<typeof useT>) {
  const map: Record<string, { text: string; className: string }> = {
    PUBLISHED: {
      text: t("employer.statusActive"),
      className: "bg-success-100 text-success-700",
    },
    DRAFT: { text: t("employer.statusDraft"), className: "bg-neutral-100 text-neutral-600" },
    CLOSED: { text: t("employer.statusClosed"), className: "bg-neutral-200 text-neutral-500" },
    PAUSED: {
      text: t("employer.statusPaused"),
      className: "bg-yellow-100 text-yellow-700",
    },
  };
  return (
    map[status] ?? {
      text: status,
      className: "bg-neutral-100 text-neutral-600",
    }
  );
}

function toggleStatusLabel(status: string, t: ReturnType<typeof useT>): string {
  if (status === "PUBLISHED") return t("employer.pauseJob");
  if (status === "PAUSED") return t("employer.resumeJob");
  return t("employer.publishJob");
}

function toggleStatusTarget(status: string): string {
  if (status === "PUBLISHED") return "PAUSED";
  return "PUBLISHED";
}

// ─── Job card ─────────────────────────────────────────────────────

function JobCard({
  job,
  onToggleStatus,
  onDelete,
}: {
  job: JobSummary;
  onToggleStatus: (id: string, target: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const badge = statusBadge(job.status, t);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 text-sm truncate">
            {job.title}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {job.siteName}
            {job.sido ? ` · ${job.sido}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
            >
              {badge.text}
            </span>
            <span className="text-xs text-neutral-400">
              {t("employer.applicants")} {job.applicationCount}
            </span>
            <span className="text-xs text-neutral-400">
              {t("common.views")} {job.viewCount}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
        <Link
          href={`/employer/jobs/${job.publicId}/edit`}
          className="flex-1 text-center border border-neutral-200 rounded-lg text-neutral-700 text-xs font-semibold py-2 hover:bg-neutral-50 transition-colors"
        >
          {t("common.edit")}
        </Link>
        {job.status !== "CLOSED" && (
          <button
            onClick={() =>
              onToggleStatus(job.publicId, toggleStatusTarget(job.status))
            }
            className="flex-1 text-center border border-primary-500 rounded-lg text-primary-500 text-xs font-semibold py-2 hover:bg-primary-50 transition-colors"
          >
            {toggleStatusLabel(job.status, t)}
          </button>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex-1 text-center border border-danger-200 rounded-lg text-danger-500 text-xs font-semibold py-2 hover:bg-danger-50 transition-colors"
          >
            {t("common.delete")}
          </button>
        ) : (
          <button
            onClick={() => {
              setConfirmDelete(false);
              onDelete(job.publicId);
            }}
            className="flex-1 text-center bg-danger-500 rounded-lg text-white text-xs font-semibold py-2 hover:bg-danger-700 transition-colors"
          >
            {t("employer.deleteConfirm")}
          </button>
        )}
      </div>
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-5 animate-pulse">
      <div className="h-4 w-2/3 bg-neutral-200 rounded mb-2" />
      <div className="h-3 w-1/2 bg-neutral-100 rounded mb-3" />
      <div className="h-8 bg-neutral-100 rounded-lg mt-4" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function EmployerJobsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(0);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "ALL", label: t("employer.tabAll") },
    { key: "PUBLISHED", label: t("employer.tabActive") },
    { key: "DRAFT", label: t("employer.tabDraft") },
    { key: "CLOSED", label: t("employer.tabClosed") },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["employer", "jobs", page],
    queryFn: () => employerApi.getMyJobs(page, PAGE_SIZE),
    throwOnError: false,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      employerApi.patchJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employerApi.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
    },
  });

  const allJobs = data?.content ?? [];
  const filteredJobs =
    tab === "ALL"
      ? allJobs
      : allJobs.filter((j: JobSummary) => j.status === tab);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-950">
            {t("employer.jobList")}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {t("employer.totalJobs" as any, data?.totalElements ?? 0)}
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="bg-primary-500 text-white rounded-lg py-2.5 px-4 font-semibold text-sm hover:bg-primary-600 transition-colors"
        >
          {"+ " + t("employer.newJob")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-neutral-100 rounded-lg p-1 w-fit">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => {
              setTab(tabItem.key);
              setPage(0);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === tabItem.key
                ? "bg-white text-neutral-900 shadow-card"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-10 text-center">
          <p className="text-sm text-neutral-400 mb-4">
            {t("employer.noJobs")}
          </p>
          <Link
            href="/employer/jobs/new"
            className="inline-block bg-primary-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            {t("employer.createFirst")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredJobs.map((job: JobSummary) => (
            <JobCard
              key={job.publicId}
              job={job}
              onToggleStatus={(id, status) =>
                statusMutation.mutate({ id, status })
              }
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border border-neutral-200 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t("common.prev")}
          </button>
          <span className="text-sm text-neutral-500 px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="border border-neutral-200 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t("common.next")}
          </button>
        </div>
      )}
    </div>
  );
}
