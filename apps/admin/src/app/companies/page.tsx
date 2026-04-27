"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Building2, CheckCircle, Clock, Ban, Plus } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminCompanyItem,
  PagedResponse,
  getAdminCompanies,
  verifyCompany,
} from "@/lib/api";

// ─── Columns ──────────────────────────────────────────────────

function buildColumns(
  handleVerify: (publicId: string) => void
): Column<AdminCompanyItem>[] {
  return [
    {
      key: "name",
      header: "건설사명",
      render: (row) => (
        <div>
          <p className="font-medium text-neutral-900">{row.name}</p>
          {row.isVerified && (
            <span className="text-[10px] text-brand-blue font-semibold">인증됨</span>
          )}
        </div>
      ),
    },
    {
      key: "businessRegistrationNumber",
      header: "사업자번호",
      render: (row) => (
        <span className="text-neutral-600 font-mono text-xs">
          {row.businessRegistrationNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "ceoName",
      header: "대표자",
      render: (row) => (
        <span className="text-neutral-700">{row.ceoName ?? "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "연락처",
      render: (row) => (
        <span className="text-neutral-600 text-xs">{row.phone ?? "—"}</span>
      ),
    },
    {
      key: "siteCount",
      header: "현장 수",
      render: (row) => (
        <span className="font-medium text-neutral-700">{row.siteCount}</span>
      ),
    },
    {
      key: "activeJobCount",
      header: "활성공고",
      render: (row) => (
        <span className="font-medium text-neutral-700">{row.activeJobCount}</span>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "adminNote",
      header: "관리자 메모",
      render: (row) =>
        row.adminNote ? (
          <span
            className="text-xs text-neutral-500"
            title={row.adminNote}
          >
            {row.adminNote.length > 30
              ? `${row.adminNote.slice(0, 30)}...`
              : row.adminNote}
          </span>
        ) : (
          <span className="text-xs text-neutral-300">—</span>
        ),
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
          {row.status === "PENDING" && (
            <button
              onClick={() => handleVerify(row.publicId)}
              className="px-2 py-1 text-xs rounded-lg bg-brand-blue text-white hover:bg-brand-blue-dark transition-colors"
            >
              인증
            </button>
          )}
          <Link
            href={`/companies/${row.publicId}/edit`}
            className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            수정
          </Link>
          <Link
            href={`/companies/${row.publicId}`}
            className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            상세보기
          </Link>
        </div>
      ),
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const SIDO_LIST = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export default function CompaniesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sidoFilter, setSidoFilter] = useState("");
  const queryClient = useQueryClient();

  const queryKey = ["admin", "companies", page, search, statusFilter, sidoFilter];

  const { data, isLoading } = useQuery<PagedResponse<AdminCompanyItem>>({
    queryKey,
    queryFn: () =>
      getAdminCompanies({
        page,
        size: PAGE_SIZE,
        keyword: search || undefined,
        status: statusFilter || undefined,
        sido: sidoFilter || undefined,
      }),
  });

  const handleVerify = useCallback(
    async (publicId: string) => {
      try {
        await verifyCompany(publicId);
        await queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      } catch (err) {
        alert(`인증 실패: ${(err as Error).message}`);
      }
    },
    [queryClient]
  );

  const columns = buildColumns(handleVerify);

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const activeCount = content.filter((c) => c.status === "ACTIVE").length;
  const pendingCount = content.filter((c) => c.status === "PENDING").length;
  const suspendedCount = content.filter((c) => c.status === "SUSPENDED").length;

  return (
    <AdminLayout breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "건설사 관리" }]}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">건설사 관리</h1>
            <p className="mt-1 text-sm text-neutral-500">
              등록된 건설 건설사를 관리합니다
            </p>
          </div>
          <Link
            href="/companies/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-amber-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            기업 등록
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 건설사</p>
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
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">활성</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                activeCount
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-neutral-500">승인대기</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                pendingCount
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="h-4 w-4 text-red-500" />
              <p className="text-xs text-neutral-500">정지됨</p>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                suspendedCount
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">건설사 목록</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="건설사명 검색..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-8 pr-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue w-56"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="px-3 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
              >
                <option value="">전체 상태</option>
                <option value="PENDING">승인대기</option>
                <option value="ACTIVE">활성</option>
                <option value="SUSPENDED">정지</option>
                <option value="CLOSED">폐업</option>
              </select>
              <select
                value={sidoFilter}
                onChange={(e) => { setSidoFilter(e.target.value); setPage(0); }}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
              >
                <option value="">전체 지역</option>
                {SIDO_LIST.map((sido) => (
                  <option key={sido} value={sido}>{sido}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data table */}
          <DataTable<AdminCompanyItem>
            columns={columns}
            data={content}
            loading={isLoading}
            skeletonRows={5}
            keyField="publicId"
          />

          {/* Pagination */}
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
