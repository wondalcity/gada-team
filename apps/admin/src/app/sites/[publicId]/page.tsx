"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getAdminSiteDetail,
  deleteSite,
  restoreSite,
  AdminSiteItem,
} from "@/lib/api";

// ─── Sub-components ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-neutral-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="h-6 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
      <p className="text-neutral-500 font-medium">현장을 찾을 수 없습니다</p>
      <Link href="/sites" className="text-sm text-brand-blue hover:underline">
        목록으로 돌아가기
      </Link>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "계획중",
  ACTIVE: "활성",
  COMPLETED: "완료",
  SUSPENDED: "중단",
};

// ─── Page ───────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AdminSiteItem>({
    queryKey: ["admin", "site", publicId],
    queryFn: () => getAdminSiteDetail(publicId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSite(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "site", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sites"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreSite(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "site", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sites"] });
    },
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "현장 관리", href: "/sites" },
    { label: data?.name ?? "현장 상세" },
  ];

  if (isLoading) return <AdminLayout breadcrumbs={breadcrumbs}><LoadingSkeleton /></AdminLayout>;
  if (!data) return <AdminLayout breadcrumbs={breadcrumbs}><NotFound /></AdminLayout>;

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Back + Edit */}
        <div className="flex items-center justify-between">
          <Link
            href="/sites"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            현장 목록
          </Link>
          <Link
            href={`/sites/${publicId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-neutral-900 hover:bg-amber-500 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            수정
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-neutral-950">{data.name}</h1>
              <StatusBadge status={data.status} />
            </div>
            {data.address && (
              <p className="text-sm text-neutral-500 mt-0.5">{data.address}</p>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-700">현장 정보</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">주소</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.address ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">시/도</p>
              <p className="text-sm font-medium text-neutral-900">{data.sido ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">시/군/구</p>
              <p className="text-sm font-medium text-neutral-900">{data.sigungu ?? "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">활성 공고</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.activeJobCount}건</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">등록일</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">
                {new Date(data.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">상태</p>
              <p className="text-sm font-medium text-neutral-900">
                {STATUS_LABELS[data.status] ?? data.status}
              </p>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">연결된 데이터</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/jobs?sitePublicId=${publicId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Briefcase className="h-4 w-4 text-neutral-400" />
              채용공고 보기
            </Link>
            <Link
              href={`/jobs/new?sitePublicId=${publicId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-500 transition-colors"
            >
              + 공고 등록
            </Link>
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
              <p className="text-sm font-medium text-neutral-800">현장 삭제</p>
              <p className="text-xs text-neutral-500 mt-0.5">소프트 삭제됩니다. 복원 가능합니다.</p>
            </div>
            <button
              onClick={() => { if (confirm("현장을 삭제하시겠습니까?")) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending || restoreMutation.isPending}
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
