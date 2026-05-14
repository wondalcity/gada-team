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
  AlertTriangle,
  ArrowRight,
  Building2,
  User,
  CalendarDays,
  BadgePercent,
  Landmark,
  Sparkles,
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
    month: "short",
    day: "numeric",
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

function getDaysUntilDue(dueDate?: string): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Status Badge ─────────────────────────────────────────────────

function CommissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    PENDING: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="h-3 w-3" />,
      label: "미납",
    },
    PAID: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "납부 완료",
    },
    WAIVED: {
      cls: "bg-neutral-100 text-neutral-500 border-neutral-200",
      icon: <XCircle className="h-3 w-3" />,
      label: "면제",
    },
  };
  const cfg = map[status] ?? { cls: "bg-neutral-50 text-neutral-500 border-neutral-200", icon: null, label: status };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SubsidyStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    PENDING: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="h-3 w-3" />,
      label: "검토 중",
    },
    APPROVED: {
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "승인됨",
    },
    REJECTED: {
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
      label: "반려",
    },
    DISBURSED: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "지급 완료",
    },
  };
  const cfg = map[status] ?? { cls: "bg-neutral-50 text-neutral-500 border-neutral-200", icon: null, label: status };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Commission Card ──────────────────────────────────────────────

function CommissionCard({ item }: { item: EmployerCommissionItem }) {
  const daysLeft = getDaysUntilDue(item.dueDate);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  const borderCls =
    item.status === "PENDING" && isOverdue
      ? "border-l-4 border-l-red-400"
      : item.status === "PENDING" && isUrgent
      ? "border-l-4 border-l-amber-400"
      : item.status === "PAID"
      ? "border-l-4 border-l-emerald-400"
      : "border-l-4 border-l-neutral-200";

  return (
    <div className={cn("rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden", borderCls)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Job / worker */}
            <p className="font-bold text-neutral-900 text-sm truncate leading-snug">
              {item.jobTitle ?? "공고 미지정"}
            </p>
            {item.workerName && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                <User className="h-3 w-3" />
                {item.workerName}
              </p>
            )}
          </div>
          <CommissionStatusBadge status={item.status} />
        </div>

        {/* Amount row */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-neutral-400" />
            <span className="text-xs text-neutral-500">
              수수료{item.ratePct != null ? ` (${item.ratePct}%)` : ""}
            </span>
          </div>
          <span
            className={cn(
              "text-base font-extrabold",
              item.status === "PENDING" ? "text-amber-600" : "text-neutral-900"
            )}
          >
            {fmtKrw(item.amountKrw)}
          </span>
        </div>

        {/* Due date / paid date */}
        {item.status === "PENDING" && item.dueDate && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
              isOverdue
                ? "bg-red-50 text-red-700"
                : isUrgent
                ? "bg-amber-50 text-amber-700"
                : "bg-neutral-50 text-neutral-500"
            )}
          >
            {(isOverdue || isUrgent) && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
            <CalendarDays className={cn("h-3.5 w-3.5 flex-shrink-0", !(isOverdue || isUrgent) && "text-neutral-400")} />
            {isOverdue
              ? `납부 기한 초과 (${fmtDate(item.dueDate)})`
              : isUrgent
              ? `납부 기한 ${daysLeft}일 남음 (${fmtDate(item.dueDate)})`
              : `납부 기한: ${fmtDate(item.dueDate)}`}
          </div>
        )}

        <p className="mt-2.5 text-right text-[11px] text-neutral-300">{fmtDatetime(item.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Subsidy Card ─────────────────────────────────────────────────

function SubsidyCard({ item }: { item: EmployerSubsidyItem }) {
  const isGov = item.subsidyType === "GOVERNMENT";

  return (
    <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                  isGov
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-purple-200 bg-purple-50 text-purple-700"
                )}
              >
                {isGov ? <Landmark className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                {isGov ? "정부 지원금" : "플랫폼 지원금"}
              </span>
            </div>
            <p className="font-bold text-neutral-900 text-sm leading-snug">{item.title}</p>
            {item.description && (
              <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{item.description}</p>
            )}
          </div>
          <SubsidyStatusBadge status={item.status} />
        </div>

        {/* Amount */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">지원금액</span>
          </div>
          <span className="text-base font-extrabold text-emerald-700">{fmtKrw(item.amountKrw)}</span>
        </div>

        {/* Disbursed date */}
        {item.disbursedAt && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
            지급일: {fmtDatetime(item.disbursedAt)}
          </div>
        )}

        <p className="mt-2.5 text-right text-[11px] text-neutral-300">{fmtDatetime(item.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Summary Stat Card ────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  valueCls,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueCls: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        highlight
          ? "border-primary-200 bg-gradient-to-br from-primary-50 to-blue-50"
          : "border-neutral-100 bg-white"
      )}
    >
      <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
        {icon}
      </div>
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className={cn("mt-0.5 text-lg font-extrabold leading-tight", valueCls)}>{value}</p>
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

  const pendingCommissions = commissions.filter((c) => c.status === "PENDING");
  const totalPending = pendingCommissions.reduce((s, c) => s + c.amountKrw, 0);
  const totalPaid = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amountKrw, 0);
  const totalSubsidies = subsidies.filter((s) => s.status === "DISBURSED").reduce((s, c) => s + c.amountKrw, 0);

  const overdueCount = pendingCommissions.filter((c) => {
    const d = getDaysUntilDue(c.dueDate);
    return d !== null && d < 0;
  }).length;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/employer"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          돌아가기
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
            <Percent className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950">수수료 / 채용 지원금</h1>
            <p className="text-sm text-neutral-400">플랫폼 수수료 내역 및 채용 지원금을 확인하세요.</p>
          </div>
        </div>
      </div>

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700">
              납부 기한이 초과된 수수료 {overdueCount}건이 있습니다
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              연체 수수료가 발생할 수 있습니다. 빠른 납부를 권장합니다.
            </p>
          </div>
          <button
            onClick={() => setActiveTab("commissions")}
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition-colors"
          >
            확인 <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard
          label="미납 수수료"
          value={fmtKrw(totalPending)}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          iconBg="bg-amber-100"
          valueCls={totalPending > 0 ? "text-amber-600" : "text-neutral-900"}
        />
        <StatCard
          label="납부 완료"
          value={fmtKrw(totalPaid)}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          iconBg="bg-emerald-100"
          valueCls="text-emerald-600"
        />
        <StatCard
          label="지급된 지원금"
          value={fmtKrw(totalSubsidies)}
          icon={<Gift className="h-4 w-4 text-primary-500" />}
          iconBg="bg-primary-100"
          valueCls="text-primary-600"
          highlight
        />
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
          수수료 내역
          {commissions.length > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeTab === "commissions"
                  ? "bg-neutral-100 text-neutral-600"
                  : "bg-neutral-200 text-neutral-500"
              )}
            >
              {commissions.length}
            </span>
          )}
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
          채용 지원금
          {subsidies.length > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeTab === "subsidies"
                  ? "bg-neutral-100 text-neutral-600"
                  : "bg-neutral-200 text-neutral-500"
              )}
            >
              {subsidies.length}
            </span>
          )}
        </button>
      </div>

      {/* Commission list */}
      {activeTab === "commissions" && (
        <div>
          {commissionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />
              ))}
            </div>
          ) : commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                <HandCoins className="h-7 w-7 text-neutral-300" />
              </div>
              <p className="font-bold text-neutral-600">수수료 내역이 없습니다</p>
              <p className="mt-1 text-sm text-neutral-400 max-w-xs">
                채용이 완료되면 플랫폼 수수료 내역이 여기에 표시됩니다.
              </p>
              <Link
                href="/employer/jobs"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                공고 관리 바로가기
              </Link>
            </div>
          ) : (
            <>
              {/* Sort: overdue first, then by due date */}
              {pendingCommissions.length > 0 && (
                <p className="mb-2 text-xs font-bold text-amber-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  미납 {pendingCommissions.length}건 · {fmtKrw(totalPending)}
                </p>
              )}
              <div className="space-y-3">
                {[
                  ...commissions.filter((c) => c.status === "PENDING"),
                  ...commissions.filter((c) => c.status !== "PENDING"),
                ].map((item) => (
                  <CommissionCard key={item.publicId} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Subsidy list */}
      {activeTab === "subsidies" && (
        <div>
          {subsidiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />
              ))}
            </div>
          ) : subsidies.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Gift className="h-7 w-7 text-emerald-300" />
              </div>
              <p className="font-bold text-neutral-600">채용 지원금 내역이 없습니다</p>
              <p className="mt-1 text-sm text-neutral-400 max-w-xs">
                정부 지원금 또는 플랫폼 지원금 혜택을 받으시면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {subsidies.filter((s) => s.status === "PENDING").length > 0 && (
                <p className="mb-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  검토 중 {subsidies.filter((s) => s.status === "PENDING").length}건
                </p>
              )}
              <div className="space-y-3">
                {subsidies.map((item) => (
                  <SubsidyCard key={item.publicId} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
