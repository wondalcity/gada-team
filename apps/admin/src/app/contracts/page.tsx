"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FileText, RefreshCw, Plus } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminContractItem,
  PagedResponse,
  getAdminContracts,
  deleteContract,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const CONTRACT_STATUS_OPTIONS = [
  { label: "전체", value: "" },
  { label: "초안", value: "DRAFT" },
  { label: "발송됨", value: "SENT" },
  { label: "서명완료", value: "SIGNED" },
  { label: "만료", value: "EXPIRED" },
  { label: "취소", value: "CANCELLED" },
];

// ─── Badge helper ─────────────────────────────────────────────

function ContractStatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { label: string; variant: "gray" | "blue" | "green" | "amber" | "red" }> = {
    DRAFT: { label: "초안", variant: "gray" },
    SENT: { label: "발송됨", variant: "blue" },
    SIGNED: { label: "서명완료", variant: "green" },
    EXPIRED: { label: "만료", variant: "amber" },
    CANCELLED: { label: "취소", variant: "red" },
  };
  const cfg = MAP[status];
  if (!cfg) return <AdminBadge label={status} variant="gray" />;
  return <AdminBadge label={cfg.label} variant={cfg.variant} />;
}

// ─── Pay formatting ───────────────────────────────────────────

const PAY_UNIT_KO: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
};

// ─── Page ─────────────────────────────────────────────────────

export default function ContractsPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PagedResponse<AdminContractItem>>({
    queryKey: ["admin", "contracts", page, status],
    queryFn: () => getAdminContracts({ page, size: PAGE_SIZE, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteContract(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contracts"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const COLUMNS: Column<AdminContractItem>[] = [
    {
      key: "publicId",
      header: "계약 번호",
      render: (row) => (
        <span className="font-mono text-xs text-neutral-600">
          {row.publicId.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => <ContractStatusBadge status={row.status} />,
    },
    {
      key: "startDate",
      header: "시작일",
      render: (row) => (
        <span className="text-xs text-neutral-600">
          {row.startDate ? new Date(row.startDate).toLocaleDateString("ko-KR") : "—"}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "종료일",
      render: (row) => (
        <span className="text-xs text-neutral-600">
          {row.endDate ? new Date(row.endDate).toLocaleDateString("ko-KR") : "—"}
        </span>
      ),
    },
    {
      key: "pay",
      header: "급여",
      render: (row) => (
        <span className="text-xs text-neutral-700 font-medium">
          {row.payAmount
            ? `${PAY_UNIT_KO[row.payUnit ?? ""] ?? ""} ${row.payAmount.toLocaleString("ko-KR")}원`
            : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "생성일",
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
        <div className="flex items-center gap-3">
          <Link
            href={`/contracts/${row.publicId}/edit`}
            className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            수정
          </Link>
          <Link
            href={`/contracts/${row.publicId}`}
            className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            상세
          </Link>
          <button
            onClick={() => {
              if (confirm("계약을 삭제하시겠습니까?")) deleteMutation.mutate(row.publicId);
            }}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            삭제
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "계약 관리" }]}
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
            href="/contracts/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-amber-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            계약 생성
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">계약 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            근로자-고용주 간 계약 목록입니다.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체</p>
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
              <FileText className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">서명완료</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((c) => c.status === "SIGNED").length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-neutral-500">발송됨</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((c) => c.status === "SENT").length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">초안</p>
            </div>
            <p className="text-2xl font-bold text-neutral-600">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((c) => c.status === "DRAFT").length
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-3 justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">계약 목록</h2>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className="px-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
            >
              {CONTRACT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <DataTable<AdminContractItem>
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
