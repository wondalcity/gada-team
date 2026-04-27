"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getAdminEmployerDetail,
  patchEmployerStatus,
  deleteEmployer,
  restoreEmployer,
  AdminEmployerDetail,
} from "@/lib/api";

// ─── Sub-components ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-neutral-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="h-6 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertCircle className="h-10 w-10 text-neutral-300" />
      <p className="text-neutral-500 font-medium">관리자를 찾을 수 없습니다</p>
      <Link href="/employers" className="text-sm text-brand-blue hover:underline">
        목록으로 돌아가기
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function EmployerDetailPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery<AdminEmployerDetail>({
    queryKey: ["admin", "employer", publicId],
    queryFn: () => getAdminEmployerDetail(publicId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => patchEmployerStatus(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "employer", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "employers"] });
      setNewStatus("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployer(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "employer", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "employers"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreEmployer(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "employer", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "employers"] });
    },
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "관리자 관리", href: "/employers" },
    { label: data?.phone ?? "관리자 상세" },
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
        <NotFound />
      </AdminLayout>
    );
  }

  const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/employers"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          관리자 목록
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-brand-blue" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-neutral-950">
                  {data.fullName ?? data.phone}
                </h1>
                <StatusBadge status={data.status} />
                {data.deletedAt && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-400 border border-neutral-200">
                    삭제됨
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-0.5">{data.phone}</p>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">전화번호</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.phone}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">기업명</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.companyName ?? "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">이메일</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.email ?? "—"}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-500 mb-1">가입일</p>
              <p className="text-sm text-neutral-700">
                {fmtDatetime(data.createdAt)}
              </p>
            </div>
            {data.deletedAt && (
              <div>
                <p className="text-xs text-red-500 mb-1">삭제일</p>
                <p className="text-sm text-red-600">
                  {fmtDatetime(data.deletedAt)}
                </p>
              </div>
            )}
          </div>

          {data.adminNote && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1">관리자 메모</p>
              <p className="text-sm text-neutral-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                {data.adminNote}
              </p>
            </div>
          )}
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
              {STATUS_OPTIONS.map((s) => (
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
          {!data.deletedAt ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-800">관리자 삭제</p>
                <p className="text-xs text-neutral-500 mt-0.5">소프트 삭제됩니다. 복원 가능합니다.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm("관리자를 삭제하시겠습니까?")) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-800">관리자 복원</p>
                <p className="text-xs text-neutral-500 mt-0.5">삭제된 관리자를 복원합니다.</p>
              </div>
              <button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="px-4 py-2 rounded-lg border border-green-200 text-green-700 bg-white text-sm font-semibold hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                {restoreMutation.isPending ? "복원 중..." : "복원하기"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
