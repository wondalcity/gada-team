"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, ChevronRight, MapPin, AlertCircle } from "lucide-react";
import { employerApi, JobSummary } from "@/lib/employer-api";
import { cn } from "@/lib/utils";

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    PUBLISHED: { label: "게시 중", className: "bg-success-50 text-success-700" },
    DRAFT:     { label: "임시저장", className: "bg-neutral-100 text-neutral-500" },
    PAUSED:    { label: "일시중지", className: "bg-warning-50 text-warning-700" },
    CLOSED:    { label: "마감",    className: "bg-danger-50 text-danger-700" },
  };
  const c = map[status] ?? { label: status, className: "bg-neutral-100 text-neutral-500" };
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", c.className)}>
      {c.label}
    </span>
  );
}

export default function ApplicantsPage() {
  const [page, setPage] = React.useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["employer-jobs-applicants", page],
    queryFn: () => employerApi.getMyJobs(page, 20),
  });

  const jobs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">지원자 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">공고별 지원자를 검토하고 채용 여부를 결정하세요</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-neutral-100 bg-white p-5 animate-pulse">
              <div className="h-4 w-1/2 bg-neutral-200 rounded mb-2" />
              <div className="h-3 w-1/4 bg-neutral-100 rounded" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-12 w-12 text-neutral-200 mb-4" />
          <p className="text-base font-bold text-neutral-600">등록된 공고가 없어요</p>
          <p className="text-sm text-neutral-400 mt-1">공고를 먼저 등록해주세요</p>
          <Link
            href="/employer/jobs/new"
            className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            공고 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.publicId}
              href={`/employer/applicants/${job.publicId}`}
              className="group flex items-center gap-4 rounded-lg border border-neutral-100 bg-white p-5 shadow-sm hover:border-primary-200 hover:shadow-md transition-all"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
                <Briefcase className="h-5 w-5 text-primary-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-neutral-900 truncate group-hover:text-primary-500 transition-colors">
                    {job.title}
                  </h3>
                  {statusBadge(job.status)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                  {job.sido && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.sido} {job.sigungu ?? ""}
                    </span>
                  )}
                  {job.categoryName && <span>{job.categoryName}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-1.5 rounded-lg bg-primary-500/10 px-3 py-1.5">
                  <Users className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-bold text-primary-500">{job.applicationCount}</span>
                  <span className="text-xs text-primary-500/70">명 지원</span>
                </div>
                <span className="text-xs text-neutral-400">모집 {job.requiredCount}명</span>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 disabled:opacity-40 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            이전
          </button>
          <span className="text-sm text-neutral-500">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 disabled:opacity-40 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
