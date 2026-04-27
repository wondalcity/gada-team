"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Coins,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { employerApi, PointChargeItem, PointBalanceData, PagedResponse } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────

function fmtKrw(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status badge ──────────────────────────────────────────────

function ChargeBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: t("employer.chargeStatusPending"),
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      label: t("employer.chargeStatusApproved"),
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      label: t("employer.chargeStatusRejected"),
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-neutral-50 text-neutral-600 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <Receipt className="h-7 w-7 text-neutral-300" />
      </div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">결제 내역이 없습니다</h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-6">
        포인트를 충전하면 결제 내역이 여기에 표시됩니다
      </p>
      <Link
        href="/employer/points"
        className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
      >
        <Coins className="h-4 w-4" />
        포인트 충전하기
      </Link>
    </div>
  );
}

// ─── Payment row ──────────────────────────────────────────────

function PaymentRow({ item }: { item: PointChargeItem }) {
  const methodLabel = item.paymentMethod === "CASH" ? "현금 이체" : "카드 결제";
  const MethodIcon = item.paymentMethod === "CASH" ? Banknote : CreditCard;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
              item.status === "APPROVED"
                ? "bg-green-50"
                : item.status === "REJECTED"
                ? "bg-red-50"
                : "bg-yellow-50"
            )}
          >
            <MethodIcon
              className={cn(
                "h-4 w-4",
                item.status === "APPROVED"
                  ? "text-green-600"
                  : item.status === "REJECTED"
                  ? "text-red-400"
                  : "text-yellow-600"
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-neutral-900">
                {fmtKrw(item.amountKrw)}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  item.status === "APPROVED" ? "text-green-600" : "text-neutral-400"
                )}
              >
                {item.status === "APPROVED" ? `+${item.pointsToAdd}P` : `${item.pointsToAdd}P`}
              </span>
              <ChargeBadge status={item.status} />
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
              <span>{methodLabel}</span>
              <span className="text-neutral-300">·</span>
              <span>{fmtDatetime(item.createdAt)}</span>
            </div>
            {item.adminNote && (
              <p className="mt-1.5 text-xs text-red-500">거절 사유: {item.adminNote}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function EmployerPaymentsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const { data: balance } = useQuery<PointBalanceData>({
    queryKey: ["employer", "points"],
    queryFn: () => employerApi.getPointBalance(),
  });

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<PointChargeItem>>({
    queryKey: ["employer", "payments", page, statusFilter],
    queryFn: () => employerApi.listChargeRequests(page, PAGE_SIZE),
  });

  const allItems = data?.content ?? [];
  const filtered = statusFilter === "ALL" ? allItems : allItems.filter((i) => i.status === statusFilter);
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const approvedItems = allItems.filter((i) => i.status === "APPROVED");
  const totalPaidKrw = approvedItems.reduce((sum, i) => sum + i.amountKrw, 0);
  const pendingCount = allItems.filter((i) => i.status === "PENDING").length;

  const STATUS_TABS = [
    { label: "전체", value: "ALL" },
    { label: "대기 중", value: "PENDING" },
    { label: "승인됨", value: "APPROVED" },
    { label: "거절됨", value: "REJECTED" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/employer/points"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        포인트로 돌아가기
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">결제 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">포인트 충전 요청 및 결제 내역을 확인합니다</p>
        </div>
        <button
          onClick={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["employer", "points"] });
          }}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-primary-500" />
            <p className="text-xs text-neutral-500">현재 잔액</p>
          </div>
          <p className="text-xl font-bold text-primary-600">{balance?.balance ?? 0}P</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <p className="text-xs text-neutral-500">총 결제금액</p>
          </div>
          <p className="text-xl font-bold text-neutral-900">
            {isLoading ? (
              <span className="inline-block h-6 w-20 rounded bg-neutral-100 animate-pulse" />
            ) : (
              fmtKrw(totalPaidKrw)
            )}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-yellow-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <p className="text-xs text-neutral-500">승인 대기</p>
          </div>
          <p className="text-xl font-bold text-yellow-700">
            {isLoading ? (
              <span className="inline-block h-6 w-8 rounded bg-neutral-100 animate-pulse" />
            ) : (
              pendingCount
            )}
            <span className="text-sm font-normal text-neutral-400 ml-1">건</span>
          </p>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>데이터를 불러오지 못했습니다.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-red-600">재시도</button>
        </div>
      )}

      {/* List card */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* Status tabs */}
        <div className="flex gap-0 border-b border-neutral-100 overflow-x-auto scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(0); }}
              className={cn(
                "flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                statusFilter === tab.value
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-xl bg-neutral-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 rounded bg-neutral-100" />
                    <div className="h-4 w-12 rounded bg-neutral-100" />
                    <div className="h-5 w-16 rounded-full bg-neutral-100" />
                  </div>
                  <div className="h-3 w-40 rounded bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((item) => (
              <PaymentRow key={item.publicId} item={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <span className="text-xs text-neutral-500">
              {page + 1} / {totalPages} · 총 {totalElements}건
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/employer/points"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 hover:bg-neutral-50 transition-colors shadow-sm group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 flex-shrink-0">
            <Coins className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">포인트 충전</p>
            <p className="text-xs text-neutral-500">새 충전 요청 보내기</p>
          </div>
        </Link>
        <Link
          href="/employer/proposals"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 hover:bg-neutral-50 transition-colors shadow-sm group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 flex-shrink-0">
            <Receipt className="h-4 w-4 text-neutral-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">{t("employer.proposalHistory")}</p>
            <p className="text-xs text-neutral-500">보낸 제안 현황 확인</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
