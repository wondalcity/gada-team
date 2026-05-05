"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  Star,
  CheckCircle,
  ClipboardList,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ApplicationDetailPanel, STATUS_LABEL, STATUS_BADGE_CLASS } from "@/components/ApplicationDetailPanel";
import {
  getAdminApplications,
  getAdminApplicationDetail,
  ApplicationSummary,
  ApplicationDetail,
  ApplicationStatus,
  ApplicationType,
  ApplicationPagedResponse,
} from "@/lib/api";

// ─── Constants ─────────────────────────────────────────────────

const PAGE_SIZE = 20;

const APP_TYPE_LABEL: Record<ApplicationType, string> = {
  INDIVIDUAL: "개인",
  TEAM: "팀",
  COMPANY: "기업",
};

const APP_TYPE_CLASS: Record<ApplicationType, string> = {
  INDIVIDUAL: "bg-blue-100 text-blue-700 border-blue-200",
  TEAM: "bg-green-100 text-green-700 border-green-200",
  COMPANY: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "전체", value: "" },
  { label: "지원완료", value: "APPLIED" },
  { label: "검토중", value: "UNDER_REVIEW" },
  { label: "서류통과", value: "SHORTLISTED" },
  { label: "면접예정", value: "INTERVIEW_PENDING" },
  { label: "보류", value: "ON_HOLD" },
  { label: "불합격", value: "REJECTED" },
  { label: "합격", value: "HIRED" },
  { label: "취소", value: "WITHDRAWN" },
];

const TYPE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "전체", value: "" },
  { label: "개인", value: "INDIVIDUAL" },
  { label: "팀", value: "TEAM" },
  { label: "기업", value: "COMPANY" },
];

// ─── Skeleton rows ─────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-neutral-50 animate-pulse">
          <td className="px-4 py-3.5">
            <div className="h-4 w-32 rounded bg-neutral-100" />
            <div className="h-3 w-20 rounded bg-neutral-100 mt-1" />
          </td>
          <td className="px-4 py-3.5 hidden sm:table-cell">
            <div className="h-4 w-28 rounded bg-neutral-100" />
          </td>
          <td className="px-4 py-3.5 hidden md:table-cell">
            <div className="h-4 w-20 rounded bg-neutral-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-5 w-14 rounded-full bg-neutral-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-5 w-16 rounded-full bg-neutral-100" />
          </td>
          <td className="px-4 py-3.5 hidden lg:table-cell">
            <div className="h-4 w-20 rounded bg-neutral-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex gap-4">
        <div className="h-14 w-14 rounded-full bg-neutral-200 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-36 rounded bg-neutral-200" />
          <div className="h-3 w-48 rounded bg-neutral-100" />
          <div className="h-3 w-40 rounded bg-neutral-100" />
        </div>
      </div>
      <div className="h-24 rounded-xl bg-neutral-100" />
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 rounded bg-neutral-100" />
              <div className="h-4 w-24 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-16 text-center">
        <ClipboardList className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
        <p className="text-sm text-neutral-500 font-medium">
          {filtered ? "검색 조건에 맞는 지원서가 없습니다" : "지원서가 없습니다"}
        </p>
        {filtered && (
          <p className="text-xs text-neutral-400 mt-1">필터를 변경해보세요</p>
        )}
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobSearchInput, setJobSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Side panel state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelDetail, setPanelDetail] = useState<ApplicationDetail | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  // Debounced search
  function handleSearchInput(val: string) {
    setJobSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setJobSearch(val);
      setPage(0);
    }, 400);
  }

  const isFiltered = !!(statusFilter || typeFilter || jobSearch);

  const { data, isLoading, refetch } = useQuery<ApplicationPagedResponse>({
    queryKey: ["admin", "applications", page, statusFilter, typeFilter, jobSearch],
    queryFn: () =>
      getAdminApplications({
        page,
        size: PAGE_SIZE,
        status: statusFilter || undefined,
        applicationType: typeFilter || undefined,
        jobPublicId: jobSearch || undefined,
      }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Load panel detail when selection changes
  useEffect(() => {
    if (!selectedId) {
      setPanelDetail(null);
      return;
    }
    setPanelLoading(true);
    setPanelError(null);
    getAdminApplicationDetail(selectedId)
      .then((d) => {
        setPanelDetail(d);
        setPanelLoading(false);
      })
      .catch((err: Error) => {
        setPanelError(err.message);
        setPanelLoading(false);
      });
  }, [selectedId]);

  function handleRowClick(app: ApplicationSummary) {
    if (selectedId === app.publicId) {
      setSelectedId(null);
    } else {
      setSelectedId(app.publicId);
    }
  }

  function handlePanelUpdated(updated: ApplicationDetail) {
    setPanelDetail(updated);
    queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "지원 관리" }]}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">지원 관리</h1>
            <p className="mt-1 text-sm text-neutral-500">
              채용공고 지원서를 검토하고 상태를 관리합니다
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 지원</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-16 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                totalElements.toLocaleString("ko-KR")
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">합격</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((a) => a.status === "HIRED").length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-400" />
              <p className="text-xs text-neutral-500">스카우트</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((a) => a.isScouted).length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-neutral-500">인증됨</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((a) => a.isVerified).length
              )}
            </p>
          </div>
        </div>

        {/* Main content — two-column split on desktop */}
        <div className="flex gap-0 lg:gap-6 items-start">
          {/* Left: table */}
          <div
            className={`min-w-0 flex-1 transition-all duration-300 ${
              selectedId ? "hidden lg:block lg:w-[60%] lg:flex-none" : "w-full"
            }`}
          >
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
              {/* Filter bar */}
              <div className="px-4 py-3 border-b border-neutral-100">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="공고 ID 검색..."
                      value={jobSearchInput}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {STATUS_FILTER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {/* Type filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {TYPE_FILTER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {/* Clear filters */}
                  {isFiltered && (
                    <button
                      onClick={() => {
                        setStatusFilter("");
                        setTypeFilter("");
                        setJobSearch("");
                        setJobSearchInput("");
                        setPage(0);
                      }}
                      className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        지원자
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                        공고 / 기업 담당자
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                        유형
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                        플래그
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                        지원일
                      </th>
                      <th className="px-4 py-3 lg:hidden" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {isLoading ? (
                      <TableSkeleton />
                    ) : content.length === 0 ? (
                      <EmptyState filtered={isFiltered} />
                    ) : (
                      content.map((app) => {
                        const isSelected = selectedId === app.publicId;
                        return (
                          <tr
                            key={app.publicId}
                            onClick={() => handleRowClick(app)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-50 border-l-2 border-brand-blue"
                                : "hover:bg-neutral-50/80 border-l-2 border-transparent"
                            }`}
                          >
                            {/* Applicant */}
                            <td className="px-4 py-3.5">
                              <p className="font-medium text-neutral-900">
                                {app.workerSnapshot?.fullName ?? "—"}
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5 sm:hidden">
                                {app.jobTitle}
                              </p>
                            </td>

                            {/* Job / Company */}
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <p
                                className="text-neutral-800 font-medium max-w-[160px] truncate"
                                title={app.jobTitle}
                              >
                                {app.jobTitle}
                              </p>
                              <p className="text-xs text-neutral-500 truncate">
                                {app.companyName}
                              </p>
                            </td>

                            {/* Type badge */}
                            <td className="px-4 py-3.5 hidden md:table-cell">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  APP_TYPE_CLASS[app.applicationType] ??
                                  "bg-neutral-100 text-neutral-600 border-neutral-200"
                                }`}
                              >
                                {APP_TYPE_LABEL[app.applicationType] ?? app.applicationType}
                              </span>
                            </td>

                            {/* Status badge */}
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  STATUS_BADGE_CLASS[app.status as ApplicationStatus] ??
                                  "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                {STATUS_LABEL[app.status as ApplicationStatus] ?? app.status}
                              </span>
                            </td>

                            {/* Flags */}
                            <td className="px-4 py-3.5 hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                {app.isScouted && (
                                  <span title="스카우트">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  </span>
                                )}
                                {app.isVerified && (
                                  <span title="인증됨">
                                    <CheckCircle className="h-4 w-4 text-blue-500" />
                                  </span>
                                )}
                                {!app.isScouted && !app.isVerified && (
                                  <span className="text-neutral-300 text-xs">—</span>
                                )}
                              </div>
                            </td>

                            {/* Applied date */}
                            <td className="px-4 py-3.5 hidden lg:table-cell">
                              <span className="text-xs text-neutral-500">
                                {fmtDatetime(app.appliedAt)}
                              </span>
                            </td>

                            {/* Mobile: drill-in link */}
                            <td className="px-4 py-3.5 lg:hidden">
                              <Link
                                href={`/applications/${app.publicId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                              >
                                상세
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  전체 {totalElements.toLocaleString("ko-KR")}건
                  {totalPages > 0 && ` · ${page + 1} / ${totalPages} 페이지`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-sm text-neutral-700 font-medium min-w-[2rem] text-center">
                    {page + 1}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: side panel (desktop only) */}
          {selectedId && (
            <div className="hidden lg:flex lg:flex-col lg:flex-none lg:w-[40%] sticky top-[72px] max-h-[calc(100vh-88px)]">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-card border-l overflow-y-auto flex-1">
                {/* Panel header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
                  <p className="text-sm font-semibold text-neutral-700">지원서 상세</p>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors text-xs"
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6">
                  {panelLoading ? (
                    <PanelSkeleton />
                  ) : panelError ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <AlertCircle className="h-8 w-8 text-red-300" />
                      <p className="text-sm text-red-500">{panelError}</p>
                      <button
                        onClick={() => setSelectedId(selectedId)} // re-trigger effect
                        className="text-xs text-brand-blue hover:underline"
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : panelDetail ? (
                    <ApplicationDetailPanel
                      data={panelDetail}
                      onUpdated={handlePanelUpdated}
                      compact
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
