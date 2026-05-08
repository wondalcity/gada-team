"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Search, CheckCircle2, Clock, XCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { adminFetch } from "@/lib/api";
import { fmtDatetime } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminBid {
  publicId: string;
  bidderType: "WORKER" | "TEAM";
  bidAmount: number;
  message?: string;
  status: "PENDING" | "SELECTED" | "REJECTED";
  selectedAt?: string;
  createdAt: string;
  jobPublicId: string;
  jobTitle: string;
  siteName: string;
  companyName: string;
  workerName?: string;
  teamName?: string;
}

interface PagedBids {
  content: AdminBid[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "검토 중", cls: "bg-yellow-50 text-yellow-700 ring-yellow-200" },
  SELECTED: { label: "선정됨", cls: "bg-green-50 text-green-700 ring-green-200" },
  REJECTED: { label: "미선정", cls: "bg-neutral-100 text-neutral-500 ring-neutral-200" },
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING: Clock,
  SELECTED: CheckCircle2,
  REJECTED: XCircle,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBidsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");

  const { data, isLoading, refetch } = useQuery<PagedBids>({
    queryKey: ["admin-bids", page, statusFilter],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), size: "20" });
      if (statusFilter) qs.set("status", statusFilter);
      return adminFetch<{ data: PagedBids }>(`/admin/bids?${qs}`).then((r) => r.data);
    },
  });

  const bids = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  const filtered = keyword
    ? bids.filter(
        (b) =>
          b.jobTitle.toLowerCase().includes(keyword.toLowerCase()) ||
          (b.workerName ?? b.teamName ?? "").toLowerCase().includes(keyword.toLowerCase()) ||
          b.companyName.toLowerCase().includes(keyword.toLowerCase())
      )
    : bids;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">입찰 관리</h1>
              <p className="text-sm text-gray-400">전체 견적 입찰 현황</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="공고명, 업체명, 입찰자 검색"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setKeyword(inputValue)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">전체 상태</option>
            <option value="PENDING">검토 중</option>
            <option value="SELECTED">선정됨</option>
            <option value="REJECTED">미선정</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-3 gap-4">
          {(["PENDING", "SELECTED", "REJECTED"] as const).map((s) => {
            const cnt = bids.filter((b) => b.status === s).length;
            const cfg = STATUS_BADGE[s];
            const Icon = STATUS_ICON[s];
            return (
              <div key={s} className="rounded-xl border bg-white p-4 flex items-center gap-3">
                <Icon className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">{cfg.label}</p>
                  <p className="text-xl font-bold text-gray-800">{cnt}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingUp className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">입찰 내역이 없습니다</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-semibold">공고 / 업체</th>
                  <th className="px-4 py-3 text-left font-semibold">입찰자</th>
                  <th className="px-4 py-3 text-right font-semibold">제안 금액</th>
                  <th className="px-4 py-3 text-center font-semibold">상태</th>
                  <th className="px-4 py-3 text-left font-semibold">등록일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((bid) => {
                  const cfg = STATUS_BADGE[bid.status];
                  const Icon = STATUS_ICON[bid.status];
                  return (
                    <tr key={bid.publicId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 line-clamp-1">{bid.jobTitle}</p>
                        <p className="text-xs text-gray-400">{bid.companyName} · {bid.siteName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700 font-medium">
                          {bid.bidderType === "TEAM" ? `${bid.teamName ?? "-"} (팀)` : (bid.workerName ?? "-")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600">
                        {formatVND(bid.bidAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cfg.cls}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDatetime(bid.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
