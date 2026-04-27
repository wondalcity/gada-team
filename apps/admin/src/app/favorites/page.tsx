"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, Heart, RefreshCw, Users, Building2, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminFavoritesResponse,
  FavoriteWorkerItem,
  FavoriteTeamItem,
  getAdminFavorites,
  removeAdminFavorite,
} from "@/lib/api";

const PAGE_SIZE = 20;

const TYPE_TABS: { label: string; value: "WORKER" | "TEAM" | undefined }[] = [
  { label: "전체", value: undefined },
  { label: "근로자", value: "WORKER" },
  { label: "팀", value: "TEAM" },
];

const NATIONALITY_LABELS: Record<string, string> = {
  KR: "한국",
  VN: "베트남",
  CN: "중국",
  PH: "필리핀",
  ID: "인도네시아",
  OTHER: "기타",
};

export default function FavoritesPage() {
  const [page, setPage] = useState(0);
  const [targetType, setTargetType] = useState<"WORKER" | "TEAM" | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<AdminFavoritesResponse>({
    queryKey: ["admin", "favorites", page, targetType],
    queryFn: () => getAdminFavorites({ targetType, page, size: PAGE_SIZE }),
  });

  const removeMutation = useMutation({
    mutationFn: ({ type, publicId }: { type: "WORKER" | "TEAM"; publicId: string }) =>
      removeAdminFavorite(type, publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "favorites"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
    },
  });

  const workers: FavoriteWorkerItem[] = data?.workers ?? [];
  const teams: FavoriteTeamItem[] = data?.teams ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const allItems = targetType === "WORKER"
    ? workers
    : targetType === "TEAM"
    ? teams
    : [...workers, ...teams];

  function handleTabChange(value: "WORKER" | "TEAM" | undefined) {
    setTargetType(value);
    setPage(0);
  }

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "찜 목록" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/workers"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            근로자
          </Link>
          <Link
            href="/teams"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            팀
          </Link>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>데이터를 불러오지 못했습니다.</span>
            <button onClick={() => refetch()} className="ml-auto text-red-600 underline">
              재시도
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
            <h1 className="text-2xl font-extrabold text-neutral-950">찜 목록</h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500">관리자가 찜한 근로자와 팀 목록입니다.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <p className="text-xs text-neutral-500">전체 찜</p>
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
              <Users className="h-4 w-4 text-brand-blue" />
              <p className="text-xs text-neutral-500">찜한 근로자</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                workers.length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-neutral-500">찜한 팀</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                teams.length
              )}
            </p>
          </div>
        </div>

        {/* List card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">찜 목록</h2>
            <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => handleTabChange(tab.value)}
                  className={
                    targetType === tab.value
                      ? "bg-pink-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                      : "text-neutral-600 hover:bg-neutral-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-neutral-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-neutral-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-neutral-100" />
                    <div className="h-3 w-48 rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Heart className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-500">찜한 항목이 없습니다</p>
              <div className="flex gap-2 mt-4">
                <Link
                  href="/workers"
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  근로자 보기
                </Link>
                <Link
                  href="/teams"
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  팀 보기
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {/* Workers */}
              {(targetType === undefined || targetType === "WORKER") && workers.map((w) => (
                <div key={`worker-${w.favoriteId}`} className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 flex-shrink-0">
                    <Users className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-900 truncate">{w.fullName ?? "미등록"}</p>
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-brand-blue border border-blue-200">
                        근로자
                      </span>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500">
                      <span className="font-mono">{w.phone}</span>
                      {w.nationality && (
                        <span>{NATIONALITY_LABELS[w.nationality] ?? w.nationality}</span>
                      )}
                      {w.visaType && <span>{w.visaType}</span>}
                    </div>
                    {w.note && (
                      <p className="mt-1 text-xs text-pink-600 italic">메모: {w.note}</p>
                    )}
                    <p className="mt-0.5 text-xs text-neutral-400">
                      찜한 날짜: {fmtDatetime(w.favoritedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/workers/${w.publicId}`}
                      className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                    >
                      상세
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("찜을 취소하시겠습니까?")) {
                          removeMutation.mutate({ type: "WORKER", publicId: String(w.publicId) });
                        }
                      }}
                      disabled={removeMutation.isPending}
                      title="찜 취소"
                      className="inline-flex items-center rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Teams */}
              {(targetType === undefined || targetType === "TEAM") && teams.map((t) => (
                <div key={`team-${t.favoriteId}`} className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 flex-shrink-0">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-900 truncate">{t.name}</p>
                      <span
                        className={
                          t.teamType === "COMPANY_LINKED"
                            ? "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                            : "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-brand-blue border border-blue-200"
                        }
                      >
                        {t.teamType === "COMPANY_LINKED" ? "기업 연결" : "스쿼드"}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500">
                      <span>팀원 {t.memberCount}명</span>
                      <span>{t.isNationwide ? "전국" : "지역"}</span>
                    </div>
                    {t.note && (
                      <p className="mt-1 text-xs text-pink-600 italic">메모: {t.note}</p>
                    )}
                    <p className="mt-0.5 text-xs text-neutral-400">
                      찜한 날짜: {fmtDatetime(t.favoritedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/teams/${t.publicId}`}
                      className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                    >
                      상세
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("찜을 취소하시겠습니까?")) {
                          removeMutation.mutate({ type: "TEAM", publicId: String(t.publicId) });
                        }
                      }}
                      disabled={removeMutation.isPending}
                      title="찜 취소"
                      className="inline-flex items-center rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
