"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminBadge } from "@/components/ui/AdminBadge";
import {
  getAdminContractDetail,
  patchContractStatus,
  deleteContract,
  AdminContractDetail,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────

const PAY_UNIT_KO: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
};

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

function DateRow({ label, date, icon: Icon }: { label: string; date: string | null; icon: React.ElementType }) {
  if (!date) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-neutral-500" />
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-medium text-neutral-800">
          {new Date(date).toLocaleString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-neutral-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="h-6 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-neutral-100 rounded" />
              <div className="h-5 w-28 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery<AdminContractDetail>({
    queryKey: ["admin", "contract", publicId],
    queryFn: () => getAdminContractDetail(publicId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => patchContractStatus(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contract", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "contracts"] });
      setNewStatus("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContract(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contracts"] });
      router.push("/contracts");
    },
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "계약 관리", href: "/contracts" },
    { label: publicId.slice(0, 8).toUpperCase() },
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
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle className="h-10 w-10 text-neutral-300" />
          <p className="text-neutral-500 font-medium">계약을 찾을 수 없습니다</p>
          <Link href="/contracts" className="text-sm text-brand-blue hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const CONTRACT_STATUSES = ["DRAFT", "SENT", "SIGNED", "EXPIRED", "CANCELLED"];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Back + header */}
        <Link
          href="/contracts"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          계약 목록
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-neutral-950 font-mono">
                  {data.publicId.slice(0, 8).toUpperCase()}
                </h1>
                <ContractStatusBadge status={data.status} />
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                생성일: {new Date(data.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        {/* Contract info */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">계약 정보</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-neutral-500 mb-1">근로자 ID</p>
              <p className="text-sm font-medium text-neutral-900 font-mono">{data.workerUserId}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">고용주 ID</p>
              <p className="text-sm font-medium text-neutral-900 font-mono">{data.employerUserId}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">공고 ID</p>
              <p className="text-sm font-medium text-neutral-900 font-mono">{data.jobId}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">시작일</p>
              <p className="text-sm font-medium text-neutral-900">
                {data.startDate ? new Date(data.startDate).toLocaleDateString("ko-KR") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">종료일</p>
              <p className="text-sm font-medium text-neutral-900">
                {data.endDate ? new Date(data.endDate).toLocaleDateString("ko-KR") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">급여</p>
              <p className="text-sm font-medium text-neutral-900">
                {data.payAmount
                  ? `${PAY_UNIT_KO[data.payUnit ?? ""] ?? ""} ${data.payAmount.toLocaleString("ko-KR")}원`
                  : "—"}
              </p>
            </div>
          </div>

          {data.terms && (
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-2">계약 조건</p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed bg-neutral-50 rounded-lg px-3 py-3">
                {data.terms}
              </p>
            </div>
          )}

          {data.documentUrl && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1">계약서 파일</p>
              <a
                href={data.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-blue hover:underline"
              >
                계약서 보기
              </a>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">주요 일자</h2>
          <div className="space-y-4">
            <DateRow label="생성일" date={data.createdAt} icon={Clock} />
            <DateRow label="발송일" date={data.sentAt} icon={Send} />
            <DateRow label="고용주 서명일" date={data.employerSignedAt} icon={CheckCircle2} />
            <DateRow label="근로자 서명일" date={data.workerSignedAt} icon={CheckCircle2} />
            <DateRow label="시작일" date={data.startDate} icon={Calendar} />
            <DateRow label="종료일" date={data.endDate} icon={Calendar} />
          </div>
        </div>

        {/* Status change */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">상태 변경</h2>
          {statusMutation.isError && (
            <p className="text-xs text-red-600 mb-3">
              오류: {(statusMutation.error as Error).message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
            >
              <option value="">상태 선택...</option>
              {CONTRACT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => { if (newStatus) statusMutation.mutate(newStatus); }}
              disabled={!newStatus || statusMutation.isPending}
              className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
            >
              {statusMutation.isPending ? "처리 중..." : "변경"}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700">위험 구역</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-800">계약 삭제</p>
              <p className="text-xs text-neutral-500 mt-0.5">계약이 영구적으로 삭제됩니다.</p>
            </div>
            <button
              onClick={() => {
                if (confirm("계약을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제하기"}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
