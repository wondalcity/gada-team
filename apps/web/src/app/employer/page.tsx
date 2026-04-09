"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { employerApi, type JobSummary } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────

function statusLabel(status: string, t: ReturnType<typeof useT>): { text: string; className: string } {
  const map: Record<string, { text: string; className: string }> = {
    PUBLISHED: { text: t("employer.statusActive"), className: "bg-success-100 text-success-700" },
    DRAFT: { text: t("employer.statusDraft"), className: "bg-neutral-100 text-neutral-600" },
    CLOSED: { text: t("employer.statusClosed"), className: "bg-neutral-200 text-neutral-500" },
    PAUSED: { text: t("employer.statusPaused"), className: "bg-yellow-100 text-yellow-700" },
  };
  return map[status] ?? { text: status, className: "bg-neutral-100 text-neutral-600" };
}

// ─── Skeleton ─────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-card-md p-6 animate-pulse">
      <div className="h-3 w-20 bg-neutral-200 rounded mb-3" />
      <div className="h-8 w-12 bg-neutral-200 rounded" />
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-card p-5 animate-pulse flex flex-col gap-2">
      <div className="h-4 w-2/3 bg-neutral-200 rounded" />
      <div className="h-3 w-1/2 bg-neutral-100 rounded" />
      <div className="h-3 w-1/3 bg-neutral-100 rounded" />
    </div>
  );
}

// ─── Job card row ─────────────────────────────────────────────────

function RecentJobCard({ job }: { job: JobSummary }) {
  const t = useT();
  const badge = statusLabel(job.status, t);
  return (
    <div className="bg-white rounded-lg shadow-card p-5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900 text-sm truncate">
          {job.title}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {job.siteName}
          {job.sido ? ` · ${job.sido}` : ""}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
          >
            {badge.text}
          </span>
          <span className="text-xs text-neutral-500">
            {t("employer.applicants")} {job.applicationCount}{t("employer.persons")}
          </span>
        </div>
      </div>
      <Link
        href={`/employer/jobs/${job.publicId}/edit`}
        className="shrink-0 text-xs text-primary-500 font-semibold hover:underline"
      >
        {t("common.edit")}
      </Link>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────

export default function EmployerDashboard() {
  const t = useT();
  const {
    data: company,
    isLoading: companyLoading,
    isError: companyError,
  } = useQuery({
    queryKey: ["employer", "company"],
    queryFn: () => employerApi.getMyCompany(),
    throwOnError: false,
    retry: false,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["employer", "jobs", 0],
    queryFn: () => employerApi.getMyJobs(0, 20),
    throwOnError: false,
    retry: false,
    enabled: !!company,
  });

  // If company fetch errored (404 = no company registered yet)
  const hasNoCompany = companyError || (!companyLoading && !company);

  if (companyLoading) {
    return (
      <div>
        <div className="h-6 w-40 bg-neutral-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (hasNoCompany) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-lg shadow-card-md p-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 bg-primary-50 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-2">
            {t("employer.noCompany")}
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            {t("employer.noCompanySub")}
          </p>
          <Link
            href="/employer/company"
            className="block w-full bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors text-center"
          >
            {t("employer.registerCompany")}
          </Link>
        </div>
      </div>
    );
  }

  const jobs = jobsData?.content ?? [];
  const publishedJobs = jobs.filter((j) => j.status === "PUBLISHED");
  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicationCount, 0);
  const recentJobs = jobs.slice(0, 5);

  return (
    <div>
      {/* Status banners */}
      {company?.status === "PENDING" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {t("employer.pendingApproval")}
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              {t("employer.pendingApprovalSub")}
            </p>
          </div>
        </div>
      )}
      {company?.status === "SUSPENDED" && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-xl">🚫</span>
          <div>
            <p className="text-sm font-semibold text-danger-700">
              {t("employer.suspended")}
            </p>
            <p className="text-xs text-danger-700 mt-0.5">
              {t("employer.suspendedSub")}
            </p>
          </div>
        </div>
      )}

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-neutral-950">
          {company?.name} {t("employer.dashboard")}
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {t("employer.greeting")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-card-md p-6">
          <p className="text-xs text-neutral-500 font-medium mb-1">
            {t("employer.activeJobs")}
          </p>
          {jobsLoading ? (
            <div className="h-8 w-12 bg-neutral-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-extrabold text-primary-500">
              {publishedJobs.length}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-card-md p-6">
          <p className="text-xs text-neutral-500 font-medium mb-1">
            {t("employer.totalApplicants")}
          </p>
          {jobsLoading ? (
            <div className="h-8 w-12 bg-neutral-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-extrabold text-neutral-900">
              {totalApplicants}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-card-md p-6">
          <p className="text-xs text-neutral-500 font-medium mb-1">{t("employer.sites")}</p>
          <p className="text-3xl font-extrabold text-neutral-900">
            {company?.siteCount ?? 0}
          </p>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-lg shadow-card-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">
            {t("employer.recentJobs")}
          </h2>
          <Link
            href="/employer/jobs"
            className="text-xs text-primary-500 font-semibold hover:underline"
          >
            {t("employer.moreJobs")}
          </Link>
        </div>

        {jobsLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="text-center py-10">
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
            {recentJobs.map((job) => (
              <RecentJobCard key={job.publicId} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
