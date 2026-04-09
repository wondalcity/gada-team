"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, HardHat, RefreshCw, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { DeleteRestoreActions } from "@/components/ui/DeleteRestoreActions";
import {
  AdminWorkerItem,
  PagedResponse,
  getAdminWorkers,
  deleteWorker,
  restoreWorker,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const NATIONALITY_LABELS: Record<string, string> = {
  KR: "한국",
  VN: "베트남",
  CN: "중국",
  PH: "필리핀",
  ID: "인도네시아",
  OTHER: "기타",
};

const STATUS_TABS: { label: string; value: string | undefined }[] = [
  { label: "전체", value: undefined },
  { label: "활성", value: "ACTIVE" },
  { label: "대기", value: "PENDING" },
  { label: "정지", value: "SUSPENDED" },
];

// ─── Columns ──────────────────────────────────────────────────

const COLUMNS: Column<AdminWorkerItem>[] = [
  {
    key: "name",
    header: "이름/번호",
    render: (row) => (
      <div>
        <p className="font-medium text-neutral-900">
          {row.fullName ?? "미등록"}
        </p>
        <p className="text-xs text-neutral-500">{row.phone}</p>
      </div>
    ),
  },
  {
    key: "role",
    header: "역할",
    render: (row) => (
      <span
        className={
          row.role === "TEAM_LEADER"
            ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
            : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-brand-blue border border-blue-200"
        }
      >
        {row.role === "TEAM_LEADER" ? "팀장" : "근로자"}
      </span>
    ),
  },
  {
    key: "nationality",
    header: "국적/비자",
    render: (row) => (
      <div>
        <p className="text-neutral-700">
          {row.nationality ? (NATIONALITY_LABELS[row.nationality] ?? row.nationality) : "—"}
        </p>
        <p className="text-xs text-neutral-500">{row.visaType ?? "—"}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "상태",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "createdAt",
    header: "가입일",
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

export default function WorkersPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<AdminWorkerItem>>({
    queryKey: ["admin", "workers", page, status],
    queryFn: () => getAdminWorkers({ page, size: PAGE_SIZE, status }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteWorker(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "workers"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (publicId: string) => restoreWorker(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "workers"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  function handleTabChange(value: string | undefined) {
    setStatus(value);
    setPage(0);
  }

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "근로자" }]}
      actions={
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      }
    >
      <div className="space-y-6">
        {isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>데이터를 불러오지 못했습니다. 로그인 상태를 확인하고 새로고침해주세요.</span>
            <button onClick={() => refetch()} className="ml-auto text-red-600 underline">재시도</button>
          </div>
        )}
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">근로자 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            플랫폼에 가입한 근로자 및 팀장 목록입니다.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 근로자</p>
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
              <HardHat className="h-4 w-4 text-brand-blue" />
              <p className="text-xs text-neutral-500">현재 페이지</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <HardHat className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-neutral-500">팀장</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((w) => w.role === "TEAM_LEADER").length
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">근로자 목록</h2>
            {/* Status filter tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => handleTabChange(tab.value)}
                  className={
                    status === tab.value
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
          <DataTable<AdminWorkerItem>
            columns={[
              ...COLUMNS,
              {
                key: "actions",
                header: "액션",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/workers/${row.publicId}`}
                      className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                    >
                      상세
                    </Link>
                    <DeleteRestoreActions
                      isDeleted={false}
                      onDelete={() => {
                        if (confirm("근로자를 삭제하시겠습니까?")) {
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
            data={content}
            loading={isLoading}
            skeletonRows={5}
            keyField="userId"
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
