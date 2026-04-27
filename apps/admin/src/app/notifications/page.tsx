"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, RefreshCw, X, Send } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminNotificationItem,
  PagedResponse,
  getAdminNotifications,
  broadcastNotification,
  deleteNotification,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const NOTIFICATION_TYPES = [
  "SYSTEM",
  "ANNOUNCEMENT",
  "APPLICATION_UPDATE",
  "SCOUT",
];

// ─── Type badge ───────────────────────────────────────────────

function NotifTypeBadge({ type }: { type: string }) {
  const MAP: Record<string, { label: string; variant: "gray" | "blue" | "green" | "purple" | "amber" }> = {
    SYSTEM: { label: "시스템", variant: "gray" },
    ANNOUNCEMENT: { label: "공지", variant: "blue" },
    APPLICATION_UPDATE: { label: "지원현황", variant: "green" },
    SCOUT: { label: "스카우트", variant: "purple" },
  };
  const cfg = MAP[type];
  if (!cfg) return <AdminBadge label={type} variant="gray" />;
  return <AdminBadge label={cfg.label} variant={cfg.variant} />;
}

// ─── Broadcast Modal ──────────────────────────────────────────

interface BroadcastModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function BroadcastModal({ onClose, onSuccess }: BroadcastModalProps) {
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("SYSTEM");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      broadcastNotification({
        userId: userId ? Number(userId) : undefined,
        type,
        title,
        body,
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => setError((err as Error).message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("제목과 본문을 입력해주세요.");
      return;
    }
    setError("");
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-neutral-900">알림 발송</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              사용자 ID <span className="font-normal text-neutral-400">(비워두면 전체 발송)</span>
            </label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="예: 12345"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">타입</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">본문</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="알림 내용"
              rows={4}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              {mutation.isPending ? "발송 중..." : "발송"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [page, setPage] = useState(0);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PagedResponse<AdminNotificationItem>>({
    queryKey: ["admin", "notifications", page],
    queryFn: () => getAdminNotifications({ page, size: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteNotification(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const COLUMNS: Column<AdminNotificationItem>[] = [
    {
      key: "userId",
      header: "사용자 ID",
      render: (row) => (
        <span className="font-mono text-sm text-neutral-600">{row.userId}</span>
      ),
    },
    {
      key: "type",
      header: "타입",
      render: (row) => <NotifTypeBadge type={row.type} />,
    },
    {
      key: "title",
      header: "제목",
      render: (row) => (
        <p className="font-medium text-neutral-900 max-w-[180px] truncate" title={row.title}>
          {row.title}
        </p>
      ),
    },
    {
      key: "body",
      header: "본문",
      render: (row) => (
        <p className="text-xs text-neutral-500 max-w-[200px] truncate" title={row.body}>
          {row.body}
        </p>
      ),
    },
    {
      key: "isRead",
      header: "읽음",
      render: (row) => (
        <AdminBadge
          label={row.isRead ? "읽음" : "안읽음"}
          variant={row.isRead ? "green" : "amber"}
        />
      ),
    },
    {
      key: "createdAt",
      header: "생성일",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {fmtDatetime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "액션",
      render: (row) => (
        <button
          onClick={() => {
            if (confirm("알림을 삭제하시겠습니까?")) deleteMutation.mutate(row.publicId);
          }}
          disabled={deleteMutation.isPending}
          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          삭제
        </button>
      ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "알림 관리" }]}
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
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">알림 관리</h1>
            <p className="mt-1 text-sm text-neutral-500">
              사용자 알림 목록 및 발송 관리입니다.
            </p>
          </div>
          <button
            onClick={() => setShowBroadcast(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm"
          >
            <Bell className="h-4 w-4" />
            알림 발송
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">알림 목록</h2>
            <p className="text-xs text-neutral-400">총 {totalElements.toLocaleString("ko-KR")}건</p>
          </div>

          <DataTable<AdminNotificationItem>
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

      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] })}
        />
      )}
    </AdminLayout>
  );
}
