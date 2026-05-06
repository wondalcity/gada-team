"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Percent,
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  HandCoins,
} from "lucide-react";
import { employerApi, type EmployerCommissionItem, type EmployerSubsidyItem } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────

function fmtKrw(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtDatetime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status Badge ─────────────────────────────────────────────────

function CommissionStatusBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    PENDING: { cls: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: <Clock className="h-3 w-3" /> },
    PAID: { cls: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    WAIVED: { cls: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: <XCircle className="h-3 w-3" /> },
  };
  const cfg = map[status] ?? { cls: "bg-neutral-50 text-neutral-500 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {t(`employer.commissionStatus.${status}` as any) || status}
    </span>
  );
}

function SubsidyStatusBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    PENDING: { cls: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: <Clock className="h-3 w-3" /> },
    APPROVED: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED: { cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    DISBURSED: { cls: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const cfg = map[status] ?? { cls: "bg-neutral-50 text-neutral-500 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {t(`employer.subsidyStatus.${status}` as any) || status}
    </span>
  );
}

// ─── Commission Card ──────────────────────────────────────────────

function CommissionCard({ item }: { item: EmployerCommissionItem }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 text-sm truncate">
            {item.jobTitle ?? "공고 미지정"}
          </p>
          {item.workerName && (
            <p className="text-xs text-neutral-500 mt-0.5">근로자: {item.workerName}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <p className="text-base font-bold text-neutral-900">{fmtKrw(item.amountKrw)}</p>
            {item.ratePct != null && (
              <span className="text-xs text-neutral-500">{item.ratePct}%</span>
            )}
          </div>
          {item.dueDate && (
            <p className="text-xs text-neutral-400 mt-1">납부 기한: {fmtDate(item.dueDate)}</p>
          )}
        </div>
        <CommissionStatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-xs text-neutral-400">{fmtDatetime(item.createdAt)}</p>
    </div>
  );
}

// ─── Subsidy Card ─────────────────────────────────────────────────

function SubsidyCard({ item }: { item: EmployerSubsidyItem }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              item.subsidyType === "GOVERNMENT"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-purple-200 bg-purple-50 text-purple-700"
            )}>
              {t(`employer.subsidyType.${item.subsidyType}` as any)}
            </span>
          </div>
          <p className="font-semibold text-neutral-900 text-sm">{item.title}</p>
          {item.description && (
            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <p className="text-base font-bold text-primary-600 mt-2">{fmtKrw(item.amountKrw)}</p>
          {item.disbursedAt && (
            <p className="text-xs text-neutral-400 mt-1">지급일: {fmtDatetime(item.disbursedAt)}</p>
          )}
        </div>
        <SubsidyStatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-xs text-neutral-400">{fmtDatetime(item.createdAt)}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function EmployerCommissionsPage() {
  const t = useT();
  const [activeTab, setActiveTab] = React.useState<"commissions" | "subsidies">("commissions");

  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ["employer", "commissions"],
    queryFn: () => employerApi.getMyCommissions(),
  });

  const { data: subsidiesData, isLoading: subsidiesLoading } = useQuery({
    queryKey: ["employer", "subsidies"],
    queryFn: () => employerApi.getMySubsidies(),
  });

  const commissions = commissionsData?.content ?? [];
  const subsidies = subsidiesData?.content ?? [];

  // Summary stats for commissions
  const totalPending = commissions
    .filter((c) => c.status === "PENDING")
    .reduce((s, c) => s + c.amountKrw, 0);
  const totalPaid = commissions
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + c.amountKrw, 0);
  const totalSubsidies = subsidies
    .filter((s) => s.status === "DISBURSED")
    .reduce((s, c) => s + c.amountKrw, 0);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/employer"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("employer.backShort")}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
            <Percent className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950">{t("employer.commissionsTitle")}</h1>
            <p className="text-sm text-neutral-500">{t("employer.commissionsDesc")}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm text-center">
          <p className="text-[11px] font-medium text-neutral-500 mb-1">미납 수수료</p>
          <p className="text-lg font-extrabold text-yellow-600">{fmtKrw(totalPending)}</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm text-center">
          <p className="text-[11px] font-medium text-neutral-500 mb-1">납부 완료</p>
          <p className="text-lg font-extrabold text-green-600">{fmtKrw(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 shadow-sm text-center">
          <p className="text-[11px] font-medium text-primary-600 mb-1">지급된 지원금</p>
          <p className="text-lg font-extrabold text-primary-600">{fmtKrw(totalSubsidies)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-neutral-100 p-1">
        <button
          onClick={() => setActiveTab("commissions")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            activeTab === "commissions"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <HandCoins className="h-4 w-4" />
          {t("employer.commissionsTab")}
        </button>
        <button
          onClick={() => setActiveTab("subsidies")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            activeTab === "subsidies"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <Gift className="h-4 w-4" />
          {t("employer.subsidiesTab")}
        </button>
      </div>

      {/* Content */}
      {activeTab === "commissions" && (
        <div className="space-y-3">
          {commissionsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
            ))
          ) : commissions.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center">
              <HandCoins className="mx-auto h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">{t("employer.noCommissions")}</p>
            </div>
          ) : (
            commissions.map((item) => <CommissionCard key={item.publicId} item={item} />)
          )}
        </div>
      )}

      {activeTab === "subsidies" && (
        <div className="space-y-3">
          {subsidiesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
            ))
          ) : subsidies.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center">
              <Gift className="mx-auto h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">{t("employer.noSubsidies")}</p>
            </div>
          ) : (
            subsidies.map((item) => <SubsidyCard key={item.publicId} item={item} />)
          )}
        </div>
      )}
    </div>
  );
}
