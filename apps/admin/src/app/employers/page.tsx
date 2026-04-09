"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, Building2, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { DeleteRestoreActions } from "@/components/ui/DeleteRestoreActions";
import {
  AdminEmployerItem,
  PagedResponse,
  getAdminEmployers,
  deleteEmployer,
  restoreEmployer,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: "전체", value: "" },
  { label: "승인대기", value: "PENDING" },
  { label: "활성", value: "ACTIVE" },
  { label: "정지", value: "SUSPENDED" },
  { label: "비활성", value: "INACTIVE" },
];

// ─── Page ─────────────────────────────────────────────────────

export default function EmployersPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<AdminEmployerItem>>({
    queryKey: ["admin", "employers", page, status],
    queryFn: () => getAdminEmployers({ page, size: PAGE_SIZE, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteEmployer(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "employers"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (publicId: string) => restoreEmployer(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "employers"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const COLUMNS: Column<AdminEmployerItem>[] = [
    {
      key: "phone",
      header: "전화번호",
      render: (row) => (
        <div className={row.deletedAt ? "opacity-60" : ""}>
          <p className="font-medium text-neutral-900">{row.phone}</p>
          {row.fullName && (
            <p className="text-xs text-neutral-500">{row.fullName}</p>
          )}
        </div>
      ),
    },
    {
      key: "companyName",
      header: "기업명",
      render: (row) => (
        <span className={`text-sm text-neutral-700 ${row.deletedAt ? "opacity-60" : ""}`}>
          {row.companyName ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => (
        <div className={row.deletedAt ? "opacity-60" : ""}>
          <StatusBadge status={row.status} />
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "가입일",
      render: (row) => (
        <span className={`text-xs text-neutral-500 ${row.deletedAt ? "opacity-60" : ""}`}>
          {new Date(row.createdAt).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "deletedAt",
      header: "삭제일",
      render: (row) =>
        row.deletedAt ? (
          <span className="text-xs text-red-500">
            {new Date(row.deletedAt).toLocaleDateString("ko-KR")}
          </span>
        ) : (
          <span className="text-xs text-neutral-300">—</span>
        ),
    },
    {
      key: "actions",
      header: "액션",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/employers/${row.publicId}`}
            className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            상세
          </Link>
          <DeleteRestoreActions
            isDeleted={!!row.deletedAt}
            onDelete={() => {
              if (confirm("관리자를 삭제하시겠습니까?")) {
                deleteMutation.mutate(row.publicId);
              }
            }}
            onRestore={() => restoreMutation.mutate(row.publicId)}
            loading={deleteMutation.isPending || restoreMutation.isPending}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "관리자 관리" }]}
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
          <h1 className="text-2xl font-extrabold text-neutral-950">관리자 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            플랫폼에 가입한 관리자(사용자) 목록입니다.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 관리자</p>
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
              <Building2 className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">활성</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((e) => e.status === "ACTIVE").length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-neutral-500">승인대기</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((e) => e.status === "PENDING").length
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-3 justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">관리자 목록</h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                className="px-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <DataTable<AdminEmployerItem>
            columns={COLUMNS}
            data={content}
            loading={isLoading}
            skeletonRows={5}
            keyField="publicId"
          />

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
