"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ChevronRight, Briefcase, AlertCircle, MapPin } from "lucide-react";
import { employerApi } from "@/lib/employer-api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    PUBLISHED: { label: "모집 중", cls: "bg-success-50 text-success-700" },
    DRAFT:     { label: "임시저장", cls: "bg-neutral-100 text-neutral-500" },
    PAUSED:    { label: "일시중지", cls: "bg-warning-50 text-warning-700" },
    CLOSED:    { label: "마감", cls: "bg-danger-50 text-danger-700" },
  };
  const c = map[status] ?? { label: status, cls: "bg-neutral-100 text-neutral-500" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", c.cls)}>{c.label}</span>
  );
}

export default function EmployerBidsPage() {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["employer-jobs-for-bids"],
    queryFn: () => employerApi.getMyJobs(0, 50),
  });

  const jobs = data?.content ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-500" />
          입찰 관리
        </h1>
        <p className="mt-1 text-sm text-neutral-400">공고별 입찰 목록을 확인하고 최종 업체를 선정하세요</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-white p-5">
              <div className="h-4 w-1/2 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-neutral-200" />
          <p className="font-semibold text-neutral-600">등록된 공고가 없습니다</p>
          <Link href="/employer/jobs/new" className="mt-4 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white">
            공고 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.publicId}
              href={`/employer/bids/${job.publicId}`}
              className="group flex items-center gap-4 rounded-xl border border-neutral-100 bg-white p-5 shadow-sm hover:border-primary-200 hover:shadow-md transition-all"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Briefcase className="h-5 w-5 text-primary-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 truncate">
                    {job.title}
                  </span>
                  {statusBadge(job.status)}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                  {job.sido && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.sido} {job.sigungu ?? ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-medium text-indigo-500">
                    <TrendingUp className="h-3 w-3" />
                    입찰 {job.bidCount}건
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300 group-hover:text-primary-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
