"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Gift,
  HandCoins,
  Banknote,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminCommissionItem,
  AdminSubsidyItem,
  PagedResponse,
  getAdminCommissions,
  createAdminCommission,
  markCommissionPaid,
  waiveCommission,
  getAdminSubsidies,
  createAdminSubsidy,
  approveSubsidy,
  rejectSubsidy,
  disburseSubsidy,
} from "@/lib/api";
import { fmtDatetime, fmtDate } from "@/lib/format";
import { cn } from "@gada/ui";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const COMMISSION_STATUS_OPTIONS = [
  { label: "전체", value: "" },
  { label: "미납", value: "PENDING" },
  { label: "납부 완료", value: "PAID" },
  { label: "면제", value: "WAIVED" },
];

const SUBSIDY_STATUS_OPTIONS = [
  { label: "전체", value: "" },
  { label: "검토 중", value: "PENDING" },
  { label: "승인됨", value: "APPROVED" },
  { label: "거절됨", value: "REJECTED" },
  { label: "지급 완료", value: "DISBURSED" },
];

// ─── Helpers ─────────────────────────────────────────────────

function fmtKrw(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ─── Status badges ─────────────────────────────────────────────

function CommissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: "미납",
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
    },
    PAID: {
      label: "납부 완료",
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    WAIVED: {
      label: "면제",
      cls: "bg-neutral-50 text-neutral-500 border-neutral-200",
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

function SubsidyStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: "검토 중",
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      label: "승인됨",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      label: "거절됨",
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
    DISBURSED: {
      label: "지급 완료",
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
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

// ─── Action Modal ─────────────────────────────────────────────

function ActionModal({
  title,
  description,
  confirmLabel,
  confirmClass,
  onClose,
  onConfirm,
  isPending,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  confirmClass?: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isPending: boolean;
}) {
  const [note, setNote] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">
        <h3 className="text-base font-bold text-neutral-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-neutral-500 mb-4">{description}</p>}
        <textarea
          className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          rows={3}
          placeholder="사유 / 메모 (선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isPending}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50",
              confirmClass ?? "bg-primary-500 hover:bg-primary-600"
            )}
          >
            {isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Commission Modal ──────────────────────────────────

function CreateCommissionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState({
    employerId: "",
    companyName: "",
    jobTitle: "",
    workerName: "",
    amountKrw: "",
    ratePct: "",
    dueDate: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      createAdminCommission({
        employerId: Number(form.employerId),
        companyName: form.companyName || undefined,
        jobTitle: form.jobTitle || undefined,
        workerName: form.workerName || undefined,
        amountKrw: Number(form.amountKrw),
        ratePct: form.ratePct ? Number(form.ratePct) : undefined,
        dueDate: form.dueDate || undefined,
      }),
    onSuccess: () => { onCreated(); onClose(); },
    onError: (e: any) => setError(e?.message ?? "생성에 실패했습니다."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl mx-4">
        <h3 className="text-base font-bold text-neutral-900 mb-4">수수료 항목 생성</h3>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">고용주 ID *</label>
              <input type="number" value={form.employerId} onChange={(e) => setForm((f) => ({ ...f, employerId: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">건설사명</label>
              <input type="text" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">공고 제목</label>
              <input type="text" value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">근로자명</label>
              <input type="text" value={form.workerName} onChange={(e) => setForm((f) => ({ ...f, workerName: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">수수료 금액 (원) *</label>
              <input type="number" value={form.amountKrw} onChange={(e) => setForm((f) => ({ ...f, amountKrw: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">요율 (%)</label>
              <input type="number" step="0.01" value={form.ratePct} onChange={(e) => setForm((f) => ({ ...f, ratePct: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">납부 기한</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={mutation.isPending}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50">
            취소
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employerId || !form.amountKrw}
            className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors disabled:opacity-50">
            {mutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            생성
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Subsidy Modal ─────────────────────────────────────

function CreateSubsidyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState({
    employerId: "",
    companyName: "",
    subsidyType: "PLATFORM",
    title: "",
    description: "",
    amountKrw: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      createAdminSubsidy({
        employerId: Number(form.employerId),
        companyName: form.companyName || undefined,
        subsidyType: form.subsidyType,
        title: form.title,
        description: form.description || undefined,
        amountKrw: Number(form.amountKrw),
      }),
    onSuccess: () => { onCreated(); onClose(); },
    onError: (e: any) => setError(e?.message ?? "생성에 실패했습니다."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl mx-4">
        <h3 className="text-base font-bold text-neutral-900 mb-4">채용 지원금 항목 생성</h3>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">고용주 ID *</label>
              <input type="number" value={form.employerId} onChange={(e) => setForm((f) => ({ ...f, employerId: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">건설사명</label>
              <input type="text" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">유형 *</label>
              <select value={form.subsidyType} onChange={(e) => setForm((f) => ({ ...f, subsidyType: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="PLATFORM">플랫폼 지원</option>
                <option value="GOVERNMENT">정부 지원</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">지원금액 (원) *</label>
              <input type="number" value={form.amountKrw} onChange={(e) => setForm((f) => ({ ...f, amountKrw: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">제목 *</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">설명</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={mutation.isPending}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50">
            취소
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employerId || !form.title || !form.amountKrw}
            className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 transition-colors disabled:opacity-50">
            {mutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            생성
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Commissions Tab ─────────────────────────────────────────────

function CommissionsTab() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [actionTarget, setActionTarget] = React.useState<{ item: AdminCommissionItem; action: "paid" | "waive" } | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-commissions", page, statusFilter],
    queryFn: () => getAdminCommissions({ page, size: PAGE_SIZE, status: statusFilter || undefined }),
  });

  const paidMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) => markCommissionPaid(publicId, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-commissions"] }); setActionTarget(null); },
  });

  const waiveMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) => waiveCommission(publicId, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-commissions"] }); setActionTarget(null); },
  });

  const COLUMNS: Column<AdminCommissionItem>[] = [
    {
      key: "companyName",
      header: "건설사",
      render: (item) => (
        <div>
          <p className="font-medium text-neutral-900 text-sm">{item.companyName ?? "—"}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{item.jobTitle ?? "공고 미지정"}</p>
        </div>
      ),
    },
    {
      key: "workerName",
      header: "근로자",
      render: (item) => <span className="text-sm">{item.workerName ?? "—"}</span>,
    },
    {
      key: "amountKrw",
      header: "수수료",
      render: (item) => (
        <div>
          <p className="text-sm font-semibold text-neutral-900">{fmtKrw(item.amountKrw)}</p>
          {item.ratePct != null && (
            <p className="text-xs text-neutral-500">{item.ratePct}%</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (item) => <CommissionStatusBadge status={item.status} />,
    },
    {
      key: "dueDate",
      header: "납부 기한",
      render: (item) => <span className="text-xs text-neutral-500">{fmtDate(item.dueDate)}</span>,
    },
    {
      key: "createdAt",
      header: "생성일",
      render: (item) => <span className="text-xs text-neutral-500">{fmtDatetime(item.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (item) =>
        item.status === "PENDING" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActionTarget({ item, action: "paid" })}
              className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
            >
              납부 처리
            </button>
            <button
              onClick={() => setActionTarget({ item, action: "waive" })}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              면제
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          {COMMISSION_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(0); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === opt.value
                  ? "bg-brand-blue text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()} className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-500 px-3 py-2 text-xs font-bold text-white hover:bg-primary-600 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            수수료 생성
          </button>
        </div>
      </div>

      <DataTable<AdminCommissionItem>
        columns={COLUMNS}
        data={data?.content ?? []}
        loading={isLoading}
        keyField="publicId"
      />

      {data && data.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            size={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {actionTarget && (
        <ActionModal
          title={actionTarget.action === "paid" ? "납부 처리" : "면제 처리"}
          description={
            actionTarget.action === "paid"
              ? `${actionTarget.item.companyName ?? ""} - ${fmtKrw(actionTarget.item.amountKrw)} 수수료를 납부 완료 처리합니다.`
              : `${actionTarget.item.companyName ?? ""} - ${fmtKrw(actionTarget.item.amountKrw)} 수수료를 면제 처리합니다.`
          }
          confirmLabel={actionTarget.action === "paid" ? "납부 완료" : "면제 처리"}
          confirmClass={actionTarget.action === "paid" ? "bg-green-600 hover:bg-green-700" : "bg-neutral-700 hover:bg-neutral-800"}
          onClose={() => setActionTarget(null)}
          onConfirm={(note) => {
            if (actionTarget.action === "paid") {
              paidMutation.mutate({ publicId: actionTarget.item.publicId, note });
            } else {
              waiveMutation.mutate({ publicId: actionTarget.item.publicId, note });
            }
          }}
          isPending={paidMutation.isPending || waiveMutation.isPending}
        />
      )}

      {showCreate && (
        <CreateCommissionModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin-commissions"] })}
        />
      )}
    </div>
  );
}

// ─── Subsidies Tab ───────────────────────────────────────────────

function SubsidiesTab() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [actionTarget, setActionTarget] = React.useState<{ item: AdminSubsidyItem; action: "approve" | "reject" | "disburse" } | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-subsidies", page, statusFilter],
    queryFn: () => getAdminSubsidies({ page, size: PAGE_SIZE, status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) => approveSubsidy(publicId, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subsidies"] }); setActionTarget(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) => rejectSubsidy(publicId, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subsidies"] }); setActionTarget(null); },
  });

  const disburseMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) => disburseSubsidy(publicId, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subsidies"] }); setActionTarget(null); },
  });

  const COLUMNS: Column<AdminSubsidyItem>[] = [
    {
      key: "title",
      header: "지원금 제목",
      render: (item) => (
        <div>
          <p className="font-medium text-neutral-900 text-sm">{item.title}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{item.companyName ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "subsidyType",
      header: "유형",
      render: (item) => (
        <span className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          item.subsidyType === "GOVERNMENT"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-purple-200 bg-purple-50 text-purple-700"
        )}>
          {item.subsidyType === "GOVERNMENT" ? "정부 지원" : "플랫폼"}
        </span>
      ),
    },
    {
      key: "amountKrw",
      header: "지원금액",
      render: (item) => <span className="text-sm font-semibold text-neutral-900">{fmtKrw(item.amountKrw)}</span>,
    },
    {
      key: "status",
      header: "상태",
      render: (item) => <SubsidyStatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      header: "생성일",
      render: (item) => <span className="text-xs text-neutral-500">{fmtDatetime(item.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.status === "PENDING" && (
            <>
              <button onClick={() => setActionTarget({ item, action: "approve" })}
                className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                승인
              </button>
              <button onClick={() => setActionTarget({ item, action: "reject" })}
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                거절
              </button>
            </>
          )}
          {item.status === "APPROVED" && (
            <button onClick={() => setActionTarget({ item, action: "disburse" })}
              className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
              지급 처리
            </button>
          )}
        </div>
      ),
    },
  ];

  const actionConfig = {
    approve: { title: "지원금 승인", confirmLabel: "승인", confirmClass: "bg-blue-600 hover:bg-blue-700" },
    reject: { title: "지원금 거절", confirmLabel: "거절", confirmClass: "bg-red-600 hover:bg-red-700" },
    disburse: { title: "지급 완료 처리", confirmLabel: "지급 완료", confirmClass: "bg-green-600 hover:bg-green-700" },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          {SUBSIDY_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(0); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === opt.value
                  ? "bg-brand-blue text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()} className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-500 px-3 py-2 text-xs font-bold text-white hover:bg-primary-600 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            지원금 생성
          </button>
        </div>
      </div>

      <DataTable<AdminSubsidyItem>
        columns={COLUMNS}
        data={data?.content ?? []}
        loading={isLoading}
        keyField="publicId"
      />

      {data && data.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            size={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {actionTarget && (() => {
        const cfg = actionConfig[actionTarget.action];
        const isPending = approveMutation.isPending || rejectMutation.isPending || disburseMutation.isPending;
        return (
          <ActionModal
            title={cfg.title}
            confirmLabel={cfg.confirmLabel}
            confirmClass={cfg.confirmClass}
            onClose={() => setActionTarget(null)}
            onConfirm={(note) => {
              const payload = { publicId: actionTarget.item.publicId, note };
              if (actionTarget.action === "approve") approveMutation.mutate(payload);
              else if (actionTarget.action === "reject") rejectMutation.mutate(payload);
              else disburseMutation.mutate(payload);
            }}
            isPending={isPending}
          />
        );
      })()}

      {showCreate && (
        <CreateSubsidyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin-subsidies"] })}
        />
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const [activeTab, setActiveTab] = React.useState<"commissions" | "subsidies">("commissions");

  return (
    <AdminLayout
      breadcrumbs={[{ label: "수수료/지원금 관리" }]}
      title="수수료/지원금 관리"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
          <Percent className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-950">수수료 / 채용 지원금 관리</h1>
          <p className="text-sm text-neutral-500">플랫폼 수수료 납부 현황 및 채용 지원금을 관리합니다.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-neutral-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab("commissions")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
            activeTab === "commissions"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <HandCoins className="h-4 w-4" />
          수수료 관리
        </button>
        <button
          onClick={() => setActiveTab("subsidies")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
            activeTab === "subsidies"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <Gift className="h-4 w-4" />
          채용 지원금
        </button>
      </div>

      {activeTab === "commissions" ? <CommissionsTab /> : <SubsidiesTab />}
    </AdminLayout>
  );
}
