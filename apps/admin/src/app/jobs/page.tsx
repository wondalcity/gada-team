"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Briefcase, Eye, FileText, PauseCircle, Plus, Pencil } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { DeleteRestoreActions } from "@/components/ui/DeleteRestoreActions";
import { AdminJobItem, PagedResponse, getAdminJobs, deleteJob, restoreJob } from "@/lib/api";

// ─── Pay formatting ───────────────────────────────────────────

const PAY_UNIT_KO: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
  LUMP_SUM: "일시불",
};

function formatPay(min?: number, max?: number, unit?: string) {
  if (!min && !max) return "협의";
  const u = PAY_UNIT_KO[unit as string] ?? "";
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  if (min && max) return `${u} ${fmt(min)}~${fmt(max)}`;
  return `${u} ${fmt(min ?? max!)}~`;
}

// ─── Application type chip ────────────────────────────────────

const APP_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "개인",
  TEAM: "팀",
  COMPANY: "기업",
};

const APP_TYPE_CLASS: Record<string, string> = {
  INDIVIDUAL: "bg-blue-100 text-blue-700",
  TEAM: "bg-green-100 text-green-700",
  COMPANY: "bg-purple-100 text-purple-700",
};

function AppTypeChips({ types }: { types?: string[] }) {
  if (!types || types.length === 0) return <span className="text-neutral-300 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${APP_TYPE_CLASS[t] ?? "bg-neutral-100 text-neutral-600"}`}
        >
          {APP_TYPE_LABEL[t] ?? t}
        </span>
      ))}
    </div>
  );
}

// ─── Columns ──────────────────────────────────────────────────

const COLUMNS: Column<AdminJobItem>[] = [
  {
    key: "title",
    header: "공고명",
    render: (row) => (
      <p className="font-medium text-neutral-900 max-w-[180px] truncate" title={row.title}>
        {row.title}
      </p>
    ),
  },
  {
    key: "companyName",
    header: "업체명",
    render: (row) => (
      <span className="text-neutral-700 text-xs">{row.companyName}</span>
    ),
  },
  {
    key: "siteName",
    header: "현장",
    render: (row) => (
      <span className="text-neutral-600 text-xs max-w-[120px] truncate block" title={row.siteName}>
        {row.siteName}
      </span>
    ),
  },
  {
    key: "region",
    header: "지역",
    render: (row) => (
      <span className="text-neutral-600 text-xs">
        {[row.sido, row.sigungu].filter(Boolean).join(" ") || "—"}
      </span>
    ),
  },
  {
    key: "categoryName",
    header: "직종",
    render: (row) => (
      <span className="text-neutral-600 text-xs">{row.categoryName ?? "—"}</span>
    ),
  },
  {
    key: "applicationTypes",
    header: "지원 방식",
    render: (row) => <AppTypeChips types={row.applicationTypes} />,
  },
  {
    key: "pay",
    header: "급여",
    render: (row) => (
      <span className="text-neutral-700 text-xs font-medium whitespace-nowrap">
        {formatPay(row.payMin, row.payMax, row.payUnit)}
      </span>
    ),
  },
  {
    key: "welfare",
    header: "복지",
    render: (row) => (
      <div className="flex gap-1">
        {row.accommodationProvided && (
          <span title="숙소제공" className="text-green-600">🏠</span>
        )}
        {row.mealProvided && (
          <span title="식사제공" className="text-orange-500">🍚</span>
        )}
        {row.transportationProvided && (
          <span title="교통비지원" className="text-blue-500">🚌</span>
        )}
        {!row.accommodationProvided && !row.mealProvided && !row.transportationProvided && (
          <span className="text-neutral-300 text-xs">—</span>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "상태",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "applicationCount",
    header: "지원수",
    render: (row) => (
      <div className="flex items-center gap-1 text-xs text-neutral-600">
        <FileText className="h-3 w-3 text-neutral-400" />
        {row.applicationCount}
      </div>
    ),
  },
  {
    key: "createdAt",
    header: "등록일",
    render: (row) => (
      <span className="text-xs text-neutral-500">
        {new Date(row.createdAt).toLocaleDateString("ko-KR")}
      </span>
    ),
  },
  {
    key: "actions",
    header: "액션",
    render: (row) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/jobs/${row.publicId}/edit`}
          className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
        >
          수정
        </Link>
        <Link
          href={`/jobs/${row.publicId}`}
          className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
        >
          상세
        </Link>
      </div>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function JobsPage() {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteJob(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (publicId: string) => restoreJob(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] }),
  });

  // ── Filter state (draft — applied on "검색" button click) ──
  const [searchDraft, setSearchDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [payMinDraft, setPayMinDraft] = useState("");
  const [payMaxDraft, setPayMaxDraft] = useState("");
  const [appTypeDraft, setAppTypeDraft] = useState("");

  // ── Applied filter state (drives query) ──────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payMinFilter, setPayMinFilter] = useState("");
  const [payMaxFilter, setPayMaxFilter] = useState("");
  const [appTypeFilter, setAppTypeFilter] = useState("");

  function applyFilters() {
    setSearch(searchDraft);
    setStatusFilter(statusDraft);
    setPayMinFilter(payMinDraft);
    setPayMaxFilter(payMaxDraft);
    setAppTypeFilter(appTypeDraft);
    setPage(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") applyFilters();
  }

  const { data, isLoading } = useQuery<PagedResponse<AdminJobItem>>({
    queryKey: ["admin", "jobs", page, search, statusFilter, payMinFilter, payMaxFilter, appTypeFilter],
    queryFn: () =>
      getAdminJobs({
        page,
        size: PAGE_SIZE,
        keyword: search || undefined,
        status: statusFilter || undefined,
        payMin: payMinFilter ? Number(payMinFilter) : undefined,
        payMax: payMaxFilter ? Number(payMaxFilter) : undefined,
        applicationType: appTypeFilter || undefined,
      }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const publishedJobs = content.filter((j) => j.status === "PUBLISHED");
  const publishedIds = new Set(publishedJobs.map((j) => j.publicId));

  const allPublishedSelected =
    publishedJobs.length > 0 &&
    publishedJobs.every((j) => selectedIds.has(j.publicId));

  function toggleSelectAll() {
    if (allPublishedSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        publishedIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        publishedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPublishedCount = [...selectedIds].filter((id) =>
    publishedIds.has(id)
  ).length;

  // Build columns with checkbox prepended and delete/restore appended
  const columnsWithCheck: Column<AdminJobItem>[] = [
    {
      key: "_check",
      header: "",
      width: "w-10",
      render: (row) =>
        row.status === "PUBLISHED" ? (
          <input
            type="checkbox"
            checked={selectedIds.has(row.publicId)}
            onChange={() => toggleSelect(row.publicId)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="block h-4 w-4" />
        ),
    },
    ...COLUMNS,
    {
      key: "deleteRestore",
      header: "삭제/복원",
      render: (row) => (
        <DeleteRestoreActions
          isDeleted={false}
          onDelete={() => {
            if (confirm("공고를 삭제하시겠습니까?")) deleteMutation.mutate(row.publicId);
          }}
          onRestore={() => restoreMutation.mutate(row.publicId)}
          loading={deleteMutation.isPending || restoreMutation.isPending}
        />
      ),
    },
  ];

  return (
    <AdminLayout breadcrumbs={[{ label: "채용공고 관리" }]}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">채용공고 관리</h1>
            <p className="mt-1 text-sm text-neutral-500">
              등록된 채용공고를 관리합니다
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-amber-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            공고 등록
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 공고</p>
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
              <Eye className="h-4 w-4 text-brand-blue" />
              <p className="text-xs text-neutral-500">게시중</p>
            </div>
            <p className="text-2xl font-bold text-brand-blue">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((j) => j.status === "PUBLISHED").length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <PauseCircle className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-neutral-500">일시중지</p>
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((j) => j.status === "PAUSED").length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">임시저장</p>
            </div>
            <p className="text-2xl font-bold text-neutral-600">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((j) => j.status === "DRAFT").length
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-neutral-100 space-y-3">
            {/* Row 1: title + bulk action */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-neutral-700">공고 목록</h2>
                {selectedPublishedCount > 0 && (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                    onClick={() => {
                      // UI only — no API call
                      alert(`${selectedPublishedCount}개 공고를 일시중지합니다 (UI only)`);
                    }}
                  >
                    <PauseCircle className="h-3.5 w-3.5" />
                    선택 일시중지 ({selectedPublishedCount})
                  </button>
                )}
              </div>

              {/* Row 1 filters: search + status */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="공고명 검색..."
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-8 pr-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue w-56"
                  />
                </div>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
                >
                  <option value="">전체 상태</option>
                  <option value="DRAFT">임시저장</option>
                  <option value="PUBLISHED">게시중</option>
                  <option value="PAUSED">일시중지</option>
                  <option value="CLOSED">마감</option>
                  <option value="ARCHIVED">보관</option>
                </select>
              </div>
            </div>

            {/* Row 2: pay range + application type + search button */}
            <div className="flex flex-wrap gap-3 items-center justify-end">
              {/* Pay range */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="최소 급여"
                  value={payMinDraft}
                  onChange={(e) => setPayMinDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-28 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                <span className="text-neutral-400 text-sm">~</span>
                <input
                  type="number"
                  placeholder="최대 급여"
                  value={payMaxDraft}
                  onChange={(e) => setPayMaxDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-28 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              {/* Application type */}
              <select
                value={appTypeDraft}
                onChange={(e) => setAppTypeDraft(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
              >
                <option value="">지원 방식 전체</option>
                <option value="INDIVIDUAL">개인 지원</option>
                <option value="TEAM">팀 지원</option>
                <option value="COMPANY">기업 채용</option>
              </select>

              {/* Search button */}
              <button
                onClick={applyFilters}
                className="px-4 py-1.5 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-brand-blue-dark transition-colors"
              >
                검색
              </button>
            </div>
          </div>

          {/* Select-all row for published */}
          {!isLoading && publishedJobs.length > 0 && (
            <div className="px-4 py-2 border-b border-neutral-50 bg-neutral-50/50 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allPublishedSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
              />
              <span className="text-xs text-neutral-500">
                게시중 공고 전체 선택 ({publishedJobs.length}개)
              </span>
            </div>
          )}

          {/* Data table */}
          <DataTable<AdminJobItem>
            columns={columnsWithCheck}
            data={content}
            loading={isLoading}
            skeletonRows={5}
            keyField="publicId"
          />

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
