"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Building2,
  Globe,
  AlertCircle,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getAdminTeamDetail,
  patchTeamStatus,
  deleteTeam,
  restoreTeam,
  AdminTeamDetail,
} from "@/lib/api";

// ─── Constants ─────────────────────────────────────────────────

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "DISSOLVED"];

// ─── Sub-components ─────────────────────────────────────────────

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

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertCircle className="h-10 w-10 text-neutral-300" />
      <p className="text-neutral-500 font-medium">팀을 찾을 수 없습니다</p>
      <Link href="/teams" className="text-sm text-brand-blue hover:underline">
        목록으로 돌아가기
      </Link>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery<AdminTeamDetail>({
    queryKey: ["admin", "team", publicId],
    queryFn: () => getAdminTeamDetail(publicId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => patchTeamStatus(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "team", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
      setNewStatus("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeam(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "team", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreTeam(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "team", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
    },
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "팀 관리", href: "/teams" },
    { label: data?.name ?? "상세" },
  ];

  if (isLoading) return <AdminLayout breadcrumbs={breadcrumbs}><LoadingSkeleton /></AdminLayout>;
  if (!data) return <AdminLayout breadcrumbs={breadcrumbs}><NotFound /></AdminLayout>;

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Back */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          팀 목록
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {data.coverImageUrl ? (
              <img src={data.coverImageUrl} alt="" className="h-full w-full object-cover rounded-2xl" />
            ) : (
              <Users className="h-7 w-7 text-purple-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-neutral-950">{data.name}</h1>
              <span className={
                data.teamType === "COMPANY_LINKED"
                  ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                  : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-brand-blue border border-blue-200"
              }>
                {data.teamType === "COMPANY_LINKED" ? "기업 연결" : "스쿼드"}
              </span>
              <StatusBadge status={data.status} />
              {data.deletedAt && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-400 border border-neutral-200">
                  삭제됨
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-0.5">
              팀원 {data.memberCount}명 · {data.isNationwide ? "전국" : "지역"} 활동
            </p>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-700">팀 정보</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <UserCheck className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">팀장</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">
                {data.leaderName ?? `ID: ${data.leaderId}`}
              </p>
              {data.leaderPhone && (
                <p className="text-xs text-neutral-500">{data.leaderPhone}</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">연결 건설사</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">
                {data.companyName ?? "독립 팀"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">활동 범위</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">
                {data.isNationwide ? "전국" : "지역"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">팀원 수</p>
              <p className="text-sm font-medium text-neutral-900">{data.memberCount}명</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">등록일</p>
              <p className="text-sm text-neutral-700">
                {new Date(data.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            {data.deletedAt && (
              <div>
                <p className="text-xs text-red-500 mb-1">삭제일</p>
                <p className="text-sm text-red-600">
                  {new Date(data.deletedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {data.description && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1">팀 소개</p>
              <p className="text-sm text-neutral-700 leading-relaxed">{data.description}</p>
            </div>
          )}

          {data.adminNote && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1">관리자 메모</p>
              <p className="text-sm text-neutral-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                {data.adminNote}
              </p>
            </div>
          )}
        </div>

        {/* Members */}
        {data.members && data.members.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-700">팀원 목록</h2>
              <span className="ml-auto text-xs text-neutral-400">{data.members.length}명</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {data.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-blue">
                        {member.fullName?.[0] ?? "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {member.fullName ?? "미등록"}
                      </p>
                      <p className="text-xs text-neutral-500">{member.phone}</p>
                    </div>
                  </div>
                  <span className={
                    member.role === "TEAM_LEADER"
                      ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                      : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-50 text-neutral-500 border border-neutral-200"
                  }>
                    {member.role === "TEAM_LEADER" ? "팀장" : "팀원"}
                  </span>
                </div>
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
                <p className="text-sm font-medium text-neutral-800">팀 삭제</p>
                <p className="text-xs text-neutral-500 mt-0.5">소프트 삭제됩니다. 복원 가능합니다.</p>
              </div>
              <button
                onClick={() => { if (confirm("팀을 삭제하시겠습니까?")) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-800">팀 복원</p>
                <p className="text-xs text-neutral-500 mt-0.5">삭제된 팀을 복원합니다.</p>
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
