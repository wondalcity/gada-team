"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Users,
  Eye,
  FileText,
  Home,
  Utensils,
  Bus,
  Calendar,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Circle,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAdminJobDetail, patchAdminJobStatus, AdminJobDetail } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────

const PAY_UNIT: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
  LUMP_SUM: "일시불",
};

function formatPay(min?: number, max?: number, unit?: string) {
  if (!min && !max) return "협의";
  const u = PAY_UNIT[unit as string] ?? "";
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  if (min && max) return `${u} ${fmt(min)} ~ ${fmt(max)}원`;
  return `${u} ${fmt(min ?? max!)}원~`;
}

function formatDate(str?: string) {
  if (!str) return null;
  return new Date(str).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "개인",
  TEAM: "팀",
};

// ─── Loading / Not Found ──────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 bg-neutral-200 rounded" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="h-8 w-72 bg-neutral-200 rounded" />
        <div className="h-4 w-48 bg-neutral-100 rounded" />
        <div className="grid grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-5 h-40" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-5 h-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertCircle className="h-10 w-10 text-neutral-300" />
      <p className="text-neutral-500 font-medium">공고를 찾을 수 없습니다</p>
      <Link href="/jobs" className="text-sm text-brand-blue hover:underline">
        목록으로 돌아가기
      </Link>
    </div>
  );
}

// ─── Status Timeline ─────────────────────────────────────────

const STATUS_STEPS = ["DRAFT", "PUBLISHED", "CLOSED"] as const;

const STATUS_STEP_LABELS: Record<string, string> = {
  DRAFT: "임시저장",
  PUBLISHED: "게시중",
  CLOSED: "마감",
};

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, idx) => {
        const done = currentIdx > idx;
        const active = currentIdx === idx;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={
                  active
                    ? "h-7 w-7 rounded-full bg-brand-blue flex items-center justify-center shadow"
                    : done
                    ? "h-7 w-7 rounded-full bg-green-500 flex items-center justify-center"
                    : "h-7 w-7 rounded-full bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center"
                }
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : active ? (
                  <CircleDot className="h-4 w-4 text-white" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-neutral-300" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  active ? "text-brand-blue" : done ? "text-green-600" : "text-neutral-400"
                }`}
              >
                {STATUS_STEP_LABELS[step]}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 ${
                  done ? "bg-green-400" : "bg-neutral-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────

function JobActionButtons({
  status,
  isMutating,
  onAction,
}: {
  status: string;
  isMutating: boolean;
  onAction: (s: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {status === "DRAFT" && (
        <button
          disabled={isMutating}
          onClick={() => onAction("PUBLISHED")}
          className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
        >
          {isMutating ? "처리 중..." : "게시하기"}
        </button>
      )}
      {status === "PUBLISHED" && (
        <button
          disabled={isMutating}
          onClick={() => onAction("PAUSED")}
          className="px-4 py-2 rounded-lg border border-orange-300 text-orange-700 bg-white text-sm font-semibold hover:bg-orange-50 disabled:opacity-50 transition-colors"
        >
          {isMutating ? "처리 중..." : "일시중지"}
        </button>
      )}
      {status === "PAUSED" && (
        <button
          disabled={isMutating}
          onClick={() => onAction("PUBLISHED")}
          className="px-4 py-2 rounded-lg border border-brand-blue text-brand-blue bg-white text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition-colors"
        >
          {isMutating ? "처리 중..." : "재게시"}
        </button>
      )}
      {(status === "PUBLISHED" || status === "PAUSED") && (
        <button
          disabled={isMutating}
          onClick={() => onAction("CLOSED")}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          마감하기
        </button>
      )}
    </div>
  );
}

// ─── Info Cell ────────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <div className="text-sm font-medium text-neutral-900">{children}</div>
    </div>
  );
}

// ─── Card Shell ───────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50">
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function AdminJobDetailPage() {
  const { publicId } = useParams() as { publicId: string };
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AdminJobDetail>({
    queryKey: ["admin", "job", publicId],
    queryFn: () => getAdminJobDetail(publicId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => patchAdminJobStatus(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "job", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "채용공고 관리", href: "/jobs" },
    { label: data?.title ?? "공고 상세" },
  ];

  if (isLoading) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <NotFound />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">

        {/* Page header */}
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            공고 목록
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-neutral-950">{data.title}</h1>
                <StatusBadge status={data.status} />
              </div>
              <p className="mt-1 text-sm text-neutral-500 flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/companies/${data.companyPublicId}`}
                  className="text-brand-blue hover:underline font-medium"
                >
                  {data.companyName}
                </Link>
                <span className="text-neutral-300">·</span>
                <span>{data.siteName}</span>
                {(data.sido || data.sigungu) && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {[data.sido, data.sigungu].filter(Boolean).join(" ")}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              {statusMutation.isError && (
                <p className="text-xs text-red-600 mb-1">
                  오류: {(statusMutation.error as Error).message}
                </p>
              )}
              <JobActionButtons
                status={data.status}
                isMutating={statusMutation.isPending}
                onAction={(s) => statusMutation.mutate(s)}
              />
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCell label="직종">
              {data.categoryName ?? "—"}
            </InfoCell>
            <InfoCell label="모집 인원">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-neutral-400" />
                {data.requiredCount}명
              </div>
            </InfoCell>
            <InfoCell label="지원 방식">
              <div className="flex gap-1 flex-wrap">
                {data.applicationTypes.length > 0 ? (
                  data.applicationTypes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-brand-blue"
                    >
                      {APPLICATION_TYPE_LABELS[t] ?? t}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </div>
            </InfoCell>
            <InfoCell label="급여">
              {formatPay(data.payMin, data.payMax, data.payUnit)}
            </InfoCell>
            <InfoCell label="모집 기간">
              {data.alwaysOpen ? (
                <span className="inline-flex items-center rounded-md bg-green-50 border border-green-100 px-2 py-0.5 text-xs text-green-700">
                  상시모집
                </span>
              ) : (
                <span className="text-xs">
                  {formatDate(data.startDate)} ~ {formatDate(data.endDate) ?? "미정"}
                </span>
              )}
            </InfoCell>
            <InfoCell label="조회 / 지원">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-neutral-600">
                  <Eye className="h-4 w-4 text-neutral-400" />
                  {data.viewCount.toLocaleString("ko-KR")}
                </span>
                <span className="flex items-center gap-1 text-neutral-600">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  {data.applicationCount.toLocaleString("ko-KR")}
                </span>
              </div>
            </InfoCell>
          </div>
        </div>

        {/* 2-column body */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-4">

            {/* Description */}
            {data.description && (
              <SectionCard title="공고 설명">
                <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </p>
              </SectionCard>
            )}

            {/* Requirements */}
            <SectionCard title="지원 요건">
              <div className="space-y-4">
                {/* Visa requirements */}
                {data.visaRequirements.length > 0 ? (
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">비자 조건</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {data.visaRequirements.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center rounded-full bg-purple-50 border border-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">비자 조건 없음</p>
                )}

                {/* Certifications */}
                {data.certificationRequirements.length > 0 && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">필요 자격증</p>
                    <ul className="space-y-1">
                      {data.certificationRequirements.map((c) => (
                        <li key={c} className="flex items-center gap-2 text-sm text-neutral-700">
                          <ClipboardList className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Health check */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      data.healthCheckRequired
                        ? "bg-orange-50 border border-orange-200 text-orange-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {data.healthCheckRequired ? "건강검진 필수" : "건강검진 불필요"}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Welfare */}
            <SectionCard title="복지 혜택">
              <div className="space-y-3">
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    data.accommodationProvided
                      ? "bg-green-50 border-green-100"
                      : "bg-neutral-50 border-neutral-100 opacity-50"
                  }`}
                >
                  <Home
                    className={`h-5 w-5 flex-shrink-0 ${
                      data.accommodationProvided ? "text-green-600" : "text-neutral-300"
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${data.accommodationProvided ? "text-green-800" : "text-neutral-400"}`}>
                      숙소 제공
                    </p>
                    <p className="text-xs text-neutral-500">
                      {data.accommodationProvided ? "숙소를 제공합니다" : "미제공"}
                    </p>
                  </div>
                  {data.accommodationProvided && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    data.mealProvided
                      ? "bg-green-50 border-green-100"
                      : "bg-neutral-50 border-neutral-100 opacity-50"
                  }`}
                >
                  <Utensils
                    className={`h-5 w-5 flex-shrink-0 ${
                      data.mealProvided ? "text-green-600" : "text-neutral-300"
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${data.mealProvided ? "text-green-800" : "text-neutral-400"}`}>
                      식사 제공
                    </p>
                    <p className="text-xs text-neutral-500">
                      {data.mealProvided ? "식사를 제공합니다" : "미제공"}
                    </p>
                  </div>
                  {data.mealProvided && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    data.transportationProvided
                      ? "bg-green-50 border-green-100"
                      : "bg-neutral-50 border-neutral-100 opacity-50"
                  }`}
                >
                  <Bus
                    className={`h-5 w-5 flex-shrink-0 ${
                      data.transportationProvided ? "text-green-600" : "text-neutral-300"
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${data.transportationProvided ? "text-green-800" : "text-neutral-400"}`}>
                      교통비 지원
                    </p>
                    <p className="text-xs text-neutral-500">
                      {data.transportationProvided ? "교통비를 지원합니다" : "미지원"}
                    </p>
                  </div>
                  {data.transportationProvided && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">

            {/* Site info */}
            <SectionCard title="근무지 정보">
              <div className="space-y-2">
                <p className="font-medium text-neutral-900 text-sm">{data.siteName}</p>
                {(data.sido || data.sigungu) && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    {[data.sido, data.sigungu].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Company info */}
            <SectionCard title="기업 정보">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-900">{data.companyName}</span>
                </div>
                <Link
                  href={`/companies/${data.companyPublicId}`}
                  className="inline-flex items-center text-xs text-brand-blue hover:underline"
                >
                  기업 상세 보기 →
                </Link>
              </div>
            </SectionCard>

            {/* Status timeline */}
            <SectionCard title="공고 상태">
              <div className="space-y-4">
                <StatusTimeline status={data.status} />
                {data.publishedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    게시일: {formatDate(data.publishedAt)}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  등록일: {formatDate(data.createdAt)}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
