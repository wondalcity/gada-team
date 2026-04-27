"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminPointChargeItem,
  PagedResponse,
  getAdminChargeRequests,
  approveChargeRequest,
  rejectChargeRequest,
} from "@/lib/api";
import { fmtDatetime } from "@/lib/format";
import { cn } from "@gada/ui";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: "전체", value: "" },
  { label: "대기 중", value: "PENDING" },
  { label: "승인됨", value: "APPROVED" },
  { label: "거절됨", value: "REJECTED" },
];

// ─── Helpers ─────────────────────────────────────────────────

function fmtKrw(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ─── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: "대기 중",
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      label: "승인됨",
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      label: "거절됨",
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-neutral-50 text-neutral-600 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Reject modal ─────────────────────────────────────────────

function RejectModal({
  item,
  onClose,
  onConfirm,
  loading,
}: {
  item: AdminPointChargeItem;
  onClose: () => void;
  onConfirm: (note: string) => void;
  loading: boolean;
}) {
  const [note, setNote] = React.useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-neutral-900 mb-1">충전 요청 거절</h3>
        <p className="text-sm text-neutral-500 mb-4">
          {fmtKrw(item.amountKrw)} ({item.pointsToAdd}P) 충전 요청을 거절합니다.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            거절 사유 (고용주에게 표시됩니다)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="거절 사유를 입력하세요"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-600 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading || !note.trim()}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl transition-colors",
              note.trim() && !loading
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
          >
            {loading ? "처리 중..." : "거절 확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function AdminPointsPage() {
  const [page, setPage] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [rejectTarget, setRejectTarget] = React.useState<AdminPointChargeItem | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; type: "success" | "error" } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<AdminPointChargeItem>>({
    queryKey: ["admin", "points", "charges", page, status],
    queryFn: () => getAdminChargeRequests({ page, size: PAGE_SIZE, status: status || undefined }),
  });

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => approveChargeRequest(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "points"] });
      showToast("충전 요청이 승인되었습니다. 포인트가 지급되었습니다.", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) =>
      rejectChargeRequest(publicId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "points"] });
      setRejectTarget(null);
      showToast("충전 요청이 거절되었습니다.", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const pendingCount = content.filter((c) => c.status === "PENDING").length;

  const COLUMNS: Column<AdminPointChargeItem>[] = [
    {
      key: "userPhone",
      header: "고용주",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-neutral-900">{row.userPhone ?? `ID: ${row.userId}`}</p>
          <p className="text-xs text-neutral-400">User #{row.userId}</p>
        </div>
      ),
    },
    {
      key: "amountKrw",
      header: "충전 금액 / 포인트",
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-neutral-900">{fmtKrw(row.amountKrw)}</p>
          <p className="text-xs text-blue-600 font-medium">+{row.pointsToAdd}P</p>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: "결제 방법",
      render: (row) => (
        <span className="text-sm text-neutral-700">
          {row.paymentMethod === "CASH" ? "현금 이체" : "카드 결제"}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "요청일시",
      render: (row) => (
        <span className="text-xs text-neutral-500">{fmtDatetime(row.createdAt)}</span>
      ),
    },
    {
      key: "adminNote",
      header: "관리자 메모",
      render: (row) => (
        <span className="text-xs text-neutral-500 max-w-[200px] block truncate">
          {row.adminNote ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "액션",
      render: (row) =>
        row.status === "PENDING" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`${fmtKrw(row.amountKrw)} 충전 요청을 승인하시겠습니까? ${row.pointsToAdd}P가 지급됩니다.`)) {
                  approveMutation.mutate(row.publicId);
                }
              }}
              disabled={approveMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1 text-xs font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-3 w-3" />
              승인
            </button>
            <button
              onClick={() => setRejectTarget(row)}
              disabled={rejectMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-3 w-3" />
              거절
            </button>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">
            {row.reviewedAt ? fmtDatetime(row.reviewedAt) : "—"}
          </span>
        ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "포인트 충전 관리" }]}
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
        {/* Toast */}
        {toast && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            {toast.msg}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>데이터를 불러오지 못했습니다.</span>
            <button onClick={() => refetch()} className="ml-auto text-red-600 underline">재시도</button>
          </div>
        )}

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">포인트 충전 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            고용주 포인트 충전 요청을 승인하거나 거절합니다. 승인 시 즉시 포인트가 지급됩니다.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 요청</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? <span className="inline-block h-7 w-12 rounded-md bg-neutral-100 animate-pulse" /> : totalElements}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-neutral-500">대기 중</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {isLoading ? <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" /> : pendingCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">승인됨</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" /> : content.filter((c) => c.status === "APPROVED").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-neutral-500">거절됨</p>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {isLoading ? <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" /> : content.filter((c) => c.status === "REJECTED").length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-3 justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">충전 요청 목록</h2>
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

          <DataTable<AdminPointChargeItem>
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

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(note) => rejectMutation.mutate({ publicId: rejectTarget.publicId, note })}
          loading={rejectMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
