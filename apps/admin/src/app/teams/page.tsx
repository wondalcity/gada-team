"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, Building2, Heart, RefreshCw, Search, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { DeleteRestoreActions } from "@/components/ui/DeleteRestoreActions";
import {
  AdminTeamItem,
  PagedResponse,
  getAdminTeams,
  deleteTeam,
  restoreTeam,
  addAdminFavorite,
  removeAdminFavorite,
} from "@/lib/api";

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value: string | undefined }[] = [
  { label: "전체", value: undefined },
  { label: "활성", value: "ACTIVE" },
  { label: "비활성", value: "INACTIVE" },
  { label: "해산", value: "DISSOLVED" },
];

export default function TeamsPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<AdminTeamItem>>({
    queryKey: ["admin", "teams", page, status, keyword],
    queryFn: () => getAdminTeams({ page, size: PAGE_SIZE, status, keyword: keyword || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteTeam(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "teams"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (publicId: string) => restoreTeam(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "teams"] }),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ publicId, isFavorited }: { publicId: string; isFavorited: boolean }) =>
      isFavorited
        ? removeAdminFavorite("TEAM", publicId)
        : addAdminFavorite("TEAM", publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "favorites"] });
    },
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  function handleTabChange(value: string | undefined) {
    setStatus(value);
    setPage(0);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(0);
  }

  const columns: Column<AdminTeamItem>[] = [
    {
      key: "name",
      header: "팀명",
      render: (row) => (
        <div>
          <p className="font-medium text-neutral-900">{row.name}</p>
          <span
            className={
              row.teamType === "COMPANY_LINKED"
                ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-brand-blue border border-blue-200"
            }
          >
            {row.teamType === "COMPANY_LINKED" ? "기업 연결" : "스쿼드"}
          </span>
        </div>
      ),
    },
    {
      key: "leaderId",
      header: "팀장 ID",
      render: (row) => <span className="font-mono text-sm text-neutral-500">{row.leaderId}</span>,
    },
    {
      key: "companyId",
      header: "기업 연결",
      render: (row) =>
        row.companyId ? (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            연결됨
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-50 text-neutral-500 border border-neutral-200">
            독립 팀
          </span>
        ),
    },
    {
      key: "memberCount",
      header: "팀원 수",
      render: (row) => (
        <div className="flex items-center gap-1.5 text-neutral-700">
          <Users className="h-3.5 w-3.5 text-neutral-400" />
          <span>{row.memberCount}명</span>
        </div>
      ),
    },
    {
      key: "isNationwide",
      header: "활동 범위",
      render: (row) => (
        <span className="text-sm text-neutral-700">{row.isNationwide ? "전국" : "지역"}</span>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "등록일",
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
        <div className="flex items-center gap-2">
          {/* 찜 버튼 */}
          <button
            type="button"
            onClick={() => favoriteMutation.mutate({ publicId: row.publicId, isFavorited: !!row.isFavorited })}
            disabled={favoriteMutation.isPending}
            title={row.isFavorited ? "찜 취소" : "찜하기"}
            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
              row.isFavorited
                ? "border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100"
                : "border-neutral-200 bg-white text-neutral-500 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-500"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${row.isFavorited ? "fill-pink-500 text-pink-500" : ""}`} />
          </button>
          <Link
            href={`/teams/${row.publicId}`}
            className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            상세
          </Link>
          <DeleteRestoreActions
            isDeleted={false}
            onDelete={() => {
              if (confirm("팀을 삭제하시겠습니까?")) deleteMutation.mutate(row.publicId);
            }}
            onRestore={() => restoreMutation.mutate(row.publicId)}
            loading={deleteMutation.isPending || restoreMutation.isPending}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "팀" }]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/favorites"
            className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-sm text-pink-600 hover:bg-pink-100 transition-colors"
          >
            <Heart className="h-3.5 w-3.5 fill-pink-500" />
            찜 목록
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
            <button onClick={() => refetch()} className="ml-auto text-red-600 underline">재시도</button>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">팀 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">플랫폼에 등록된 모든 팀 목록입니다.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 팀</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? <span className="inline-block h-7 w-16 rounded-md bg-neutral-100 animate-pulse" /> : totalElements.toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-neutral-500">기업 연결</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" /> : content.filter((t) => t.teamType === "COMPANY_LINKED").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <p className="text-xs text-neutral-500">찜한 팀</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" /> : content.filter((t) => t.isFavorited).length}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-col gap-3">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              {/* 검색 */}
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="팀명 검색..."
                    className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
                <button type="submit" className="rounded-lg bg-brand-blue px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 transition-colors">
                  검색
                </button>
                {keyword && (
                  <button
                    type="button"
                    onClick={() => { setKeyword(""); setSearchInput(""); setPage(0); }}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
                  >
                    초기화
                  </button>
                )}
              </form>

              {/* 상태 필터 */}
              <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => handleTabChange(tab.value)}
                    className={
                      status === tab.value
                        ? "bg-brand-blue text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                        : "text-neutral-600 hover:bg-neutral-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="text-sm font-semibold text-neutral-700">
              팀 목록
              {keyword && <span className="ml-2 text-brand-blue">"{keyword}" 검색 결과</span>}
            </h2>
          </div>

          <DataTable<AdminTeamItem>
            columns={columns}
            data={content}
            loading={isLoading}
            skeletonRows={5}
            keyField="publicId"
          />

          {!isLoading && content.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-500">팀이 없습니다</p>
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
