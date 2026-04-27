"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Globe,
  Award,
  Heart,
  AlertCircle,
  AlertTriangle,
  User,
  Briefcase,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getAdminWorkerDetail,
  patchWorkerStatus,
  deleteWorker,
  restoreWorker,
  AdminWorkerDetail,
} from "@/lib/api";

// ─── Constants ─────────────────────────────────────────────────

const NATIONALITY_LABELS: Record<string, string> = {
  KR: "한국", VN: "베트남", CN: "중국", PH: "필리핀", ID: "인도네시아", OTHER: "기타",
};

const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어", vi: "베트남어", en: "영어", zh: "중국어",
};

const LEVEL_LABELS: Record<string, string> = {
  NATIVE: "원어민", FLUENT: "유창", INTERMEDIATE: "중급", BASIC: "기초",
};

const HEALTH_LABELS: Record<string, string> = {
  COMPLETED: "완료", NOT_DONE: "미완료", EXPIRED: "만료",
};

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"];

// ─── Sub-components ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-neutral-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="h-6 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
      <p className="text-neutral-500 font-medium">근로자를 찾을 수 없습니다</p>
      <Link href="/workers" className="text-sm text-brand-blue hover:underline">
        목록으로 돌아가기
      </Link>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-neutral-900">{value || "—"}</p>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery<AdminWorkerDetail>({
    queryKey: ["admin", "worker", publicId],
    queryFn: () => getAdminWorkerDetail(publicId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => patchWorkerStatus(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "worker", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workers"] });
      setNewStatus("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorker(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "worker", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workers"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreWorker(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "worker", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workers"] });
    },
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "근로자 관리", href: "/workers" },
    { label: data?.fullName ?? "상세" },
  ];

  if (isLoading) return <AdminLayout breadcrumbs={breadcrumbs}><LoadingSkeleton /></AdminLayout>;
  if (!data) return <AdminLayout breadcrumbs={breadcrumbs}><NotFound /></AdminLayout>;

  const payLabel = data.desiredPayMin
    ? `${data.desiredPayMin.toLocaleString()}~${(data.desiredPayMax ?? 0).toLocaleString()}원 / ${data.desiredPayUnit ?? ""}`
    : "—";

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Back */}
        <Link
          href="/workers"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          근로자 목록
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {data.profileImageUrl ? (
                <img src={data.profileImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-brand-blue" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-neutral-950">
                  {data.fullName || "미등록"}
                </h1>
                <span className={
                  data.role === "TEAM_LEADER"
                    ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                    : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-brand-blue border border-blue-200"
                }>
                  {data.role === "TEAM_LEADER" ? "팀장" : "근로자"}
                </span>
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

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-700">기본 정보</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">전화번호</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.phone}</p>
            </div>
            <InfoRow label="생년월일" value={data.birthDate ?? undefined} />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">국적</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">
                {NATIONALITY_LABELS[data.nationality] ?? data.nationality ?? "—"}
              </p>
            </div>
            <InfoRow label="비자 유형" value={data.visaType} />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Heart className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">건강검진</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">
                {HEALTH_LABELS[data.healthCheckStatus] ?? data.healthCheckStatus ?? "—"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">희망 급여</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{payLabel}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-x-6 gap-y-5">
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

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <h2 className="text-sm font-semibold text-neutral-700 mb-3">언어 능력</h2>
            <div className="flex flex-wrap gap-2">
              {data.languages.map((lang, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm text-blue-700">
                  <span className="font-medium">{LANGUAGE_LABELS[lang.code] ?? lang.code}</span>
                  <span className="text-blue-400 text-xs">· {LEVEL_LABELS[lang.level] ?? lang.level}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-700">자격증</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.certifications.map((cert, i) => (
                <span key={i} className="inline-flex items-center rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">
                  {cert.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status change */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">상태 변경</h2>
          {statusMutation.isError && (
            <p className="text-xs text-red-600 mb-3">오류: {(statusMutation.error as Error).message}</p>
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
                <p className="text-sm font-medium text-neutral-800">근로자 삭제</p>
                <p className="text-xs text-neutral-500 mt-0.5">소프트 삭제됩니다. 복원 가능합니다.</p>
              </div>
              <button
                onClick={() => { if (confirm("근로자를 삭제하시겠습니까?")) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-800">근로자 복원</p>
                <p className="text-xs text-neutral-500 mt-0.5">삭제된 근로자를 복원합니다.</p>
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
