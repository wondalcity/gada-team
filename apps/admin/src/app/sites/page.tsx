"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MapPin, CheckCircle, Clock, RefreshCw, Plus } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { DeleteRestoreActions } from "@/components/ui/DeleteRestoreActions";
import { AdminSiteItem, PagedResponse, getAdminSites, deleteSite, restoreSite } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value: string | undefined }[] = [
  { label: "전체", value: undefined },
  { label: "활성", value: "ACTIVE" },
  { label: "계획", value: "PLANNING" },
  { label: "완료", value: "COMPLETED" },
];

// ─── Columns ──────────────────────────────────────────────────

const COLUMNS: Column<AdminSiteItem>[] = [
  {
    key: "name",
    header: "현장명",
    render: (row) => (
      <p className="font-medium text-neutral-900 max-w-[180px] truncate" title={row.name}>
        {row.name}
      </p>
    ),
  },
  {
    key: "address",
    header: "주소",
    render: (row) => (
      <span
        className="text-xs text-neutral-600 max-w-[200px] truncate block"
        title={row.address}
      >
        {row.address ?? "—"}
      </span>
    ),
  },
  {
    key: "sido",
    header: "시/도",
    render: (row) => (
      <span className="text-sm text-neutral-700">{row.sido ?? "—"}</span>
    ),
  },
  {
    key: "sigungu",
    header: "시/군/구",
    render: (row) => (
      <span className="text-sm text-neutral-600">{row.sigungu ?? "—"}</span>
    ),
  },
  {
    key: "activeJobCount",
    header: "활성 공고",
    render: (row) => (
      <span className="font-medium text-neutral-700">{row.activeJobCount}</span>
    ),
  },
  {
    key: "status",
    header: "상태",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "createdAt",
    header: "등록일",
    render: (row) => (
      <span className="text-xs text-neutral-500">
        {new Date(row.createdAt).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
      </span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────

export default function SitesPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PagedResponse<AdminSiteItem>>({
    queryKey: ["admin", "sites", page, statusFilter],
    queryFn: () => getAdminSites({ page, size: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteSite(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sites"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (publicId: string) => restoreSite(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sites"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const activeCount = content.filter((s) => s.status === "ACTIVE").length;
  const planningCount = content.filter((s) => s.status === "PLANNING").length;

  const filtered = statusFilter
    ? content.filter((s) => s.status === statusFilter)
    : content;

  function handleTabChange(value: string | undefined) {
    setStatusFilter(value);
    setPage(0);
  }

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "현장 관리" }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
          <Link
            href="/sites/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-amber-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            현장 추가
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">현장 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            등록된 건설 현장 목록입니다. 현장은 업체(고용주)가 직접 관리합니다.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 현장</p>
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
              <p className="text-xs text-neutral-500">활성</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                activeCount
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-neutral-500">계획</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                planningCount
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">현장 목록</h2>
            <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => handleTabChange(tab.value)}
                  className={
                    statusFilter === tab.value
                      ? "bg-brand-blue text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                      : "text-neutral-600 hover:bg-neutral-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data table */}
          <DataTable<AdminSiteItem>
            columns={[
              ...COLUMNS,
              {
                key: "actions",
                header: "액션",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/sites/${row.publicId}`}
                      className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                    >
                      상세
                    </Link>
                    <Link
                      href={`/sites/${row.publicId}/edit`}
                      className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                    >
                      수정
                    </Link>
                    <DeleteRestoreActions
                      isDeleted={false}
                      onDelete={() => {
                        if (confirm("현장을 삭제하시겠습니까?")) {
                          deleteMutation.mutate(row.publicId);
                        }
                      }}
                      onRestore={() => restoreMutation.mutate(row.publicId)}
                      loading={deleteMutation.isPending || restoreMutation.isPending}
                    />
                  </div>
                ),
              },
            ]}
            data={filtered}
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
