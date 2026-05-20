"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ChevronRight, Briefcase, AlertCircle, MapPin, CheckCircle2, Gift } from "lucide-react";
import { employerApi } from "@/lib/employer-api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { getAllDemoSelections } from "@/lib/demo-bid-selections";

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

type TabKey = "pending" | "completed";

export default function EmployerBidsPage() {
  const t = useT();
  const [tab, setTab] = React.useState<TabKey>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["employer-jobs-for-bids"],
    queryFn: () => employerApi.getMyJobs(0, 50),
  });

  // Re-render when demo selections change (window event from same tab via storage)
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const jobs = data?.content ?? [];

  const selectedJobIds =
    typeof window === "undefined"
      ? new Set<string>()
      : new Set(getAllDemoSelections().map((s) => s.jobPublicId));

  const completedJobs = jobs.filter((j) => selectedJobIds.has(j.publicId));
  const pendingJobs = jobs.filter((j) => !selectedJobIds.has(j.publicId));

  const visibleJobs = tab === "pending" ? pendingJobs : completedJobs;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-500" />
          입찰 관리
        </h1>
        <p className="mt-1 text-sm text-neutral-400">공고별 입찰 목록을 확인하고 최종 업체를 선정하세요</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-lg border border-neutral-200 bg-white p-1">
        <button
          onClick={() => setTab("pending")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
            tab === "pending"
              ? "bg-primary-500 text-white"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          입찰 목록
          <span className={cn(
            "ml-1.5 inline-block rounded-full px-1.5 py-0 text-[10px] font-bold",
            tab === "pending" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
          )}>
            {pendingJobs.length}
          </span>
        </button>
        <button
          onClick={() => setTab("completed")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
            tab === "completed"
              ? "bg-success-700 text-white"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          선정 완료
          <span className={cn(
            "ml-1.5 inline-block rounded-full px-1.5 py-0 text-[10px] font-bold",
            tab === "completed" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
          )}>
            {completedJobs.length}
          </span>
        </button>
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
      ) : visibleJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-neutral-200" />
          <p className="font-semibold text-neutral-600">
            {tab === "pending" ? "선정 대기 중인 공고가 없습니다" : "선정 완료된 공고가 없습니다"}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {tab === "pending"
              ? "모든 공고의 입찰이 선정 완료되었습니다"
              : "입찰을 선정하면 여기에 표시됩니다"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job) => {
            const isCompleted = selectedJobIds.has(job.publicId);
            return (
              <Link
                key={job.publicId}
                href={`/employer/bids/${job.publicId}`}
                className={cn(
                  "group flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
                  isCompleted
                    ? "border-success-200 hover:border-success-300"
                    : "border-neutral-100 hover:border-primary-200"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg",
                  isCompleted ? "bg-success-50" : "bg-primary-50"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-success-700" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-primary-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "text-sm font-bold text-neutral-900 truncate",
                      isCompleted ? "group-hover:text-success-700" : "group-hover:text-primary-600"
                    )}>
                      {job.title}
                    </span>
                    {statusBadge(job.status)}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-bold text-success-700 border border-success-200">
                        <Gift className="h-2.5 w-2.5" />
                        무료 연락
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                    {job.sido && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.sido} {job.sigungu ?? ""}
                      </span>
                    )}
                    {isCompleted ? (
                      <span className="flex items-center gap-1 font-medium text-success-700">
                        <CheckCircle2 className="h-3 w-3" />
                        선정 완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-indigo-500">
                        <TrendingUp className="h-3 w-3" />
                        입찰 {job.bidCount}건
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 flex-shrink-0 text-neutral-300",
                  isCompleted ? "group-hover:text-success-400" : "group-hover:text-primary-400"
                )} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
