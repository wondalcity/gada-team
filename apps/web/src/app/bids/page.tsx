"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, Building2, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyBid {
  publicId: string;
  bidderType: "WORKER" | "TEAM";
  bidAmount: number;
  message?: string;
  status: "PENDING" | "SELECTED" | "REJECTED";
  selectedAt?: string;
  createdAt: string;
  job: {
    publicId: string;
    title: string;
    payMin?: number;
    payMax?: number;
    payUnit: string;
    jobStatus: string;
    siteName: string;
    sido?: string;
    sigungu?: string;
    companyName: string;
    companyLogoUrl: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

const STATUS_CONFIG = {
  PENDING: { label: "검토 중", icon: Clock, cls: "bg-warning-50 text-warning-700 border-warning-200" },
  SELECTED: { label: "선정됨", icon: CheckCircle2, cls: "bg-success-50 text-success-700 border-success-200" },
  REJECTED: { label: "미선정", icon: XCircle, cls: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

function BidStatusBadge({ status }: { status: "PENDING" | "SELECTED" | "REJECTED" }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", cfg.cls)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── BidCard ──────────────────────────────────────────────────────────────────

function BidCard({ bid }: { bid: MyBid }) {
  return (
    <div className={cn(
      "rounded-xl border bg-white p-5 shadow-sm transition-all",
      bid.status === "SELECTED" && "border-success-300 bg-success-50/30",
      bid.status === "REJECTED" && "border-neutral-200 opacity-70",
      bid.status === "PENDING" && "border-neutral-200 hover:border-primary-200 hover:shadow-md",
    )}>
      {/* Job info */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/jobs/${bid.job.publicId}`} className="text-sm font-bold text-neutral-900 hover:text-primary-500 line-clamp-2">
            {bid.job.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{bid.job.companyName}</span>
            {bid.job.sido && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{bid.job.sido} {bid.job.sigungu ?? ""}</span>
            )}
          </div>
        </div>
        <BidStatusBadge status={bid.status} />
      </div>

      {/* Bid info */}
      <div className="rounded-lg bg-neutral-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">내 제안 금액</span>
          <span className="text-base font-bold text-primary-600">{formatVND(bid.bidAmount)}</span>
        </div>
        {bid.message && (
          <p className="mt-2 border-t border-neutral-200 pt-2 text-xs text-neutral-500 line-clamp-2">{bid.message}</p>
        )}
      </div>

      {/* Status message */}
      {bid.status === "SELECTED" && (
        <div className="mt-3 rounded-lg bg-success-50 border border-success-200 px-3 py-2 text-xs text-success-700 font-medium">
          🎉 축하합니다! 최종 선정되었습니다.
        </div>
      )}
      {bid.status === "REJECTED" && (
        <div className="mt-3 text-xs text-neutral-400">이번에는 선정되지 않았습니다. 다음 기회를 노려보세요.</div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span>{bid.bidderType === "TEAM" ? "팀 입찰" : "개인 입찰"}</span>
        <span>{new Date(bid.createdAt).toLocaleDateString("ko-KR")}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all", label: "전체" },
  { key: "PENDING", label: "검토 중" },
  { key: "SELECTED", label: "선정됨" },
  { key: "REJECTED", label: "미선정" },
] as const;

export default function MyBidsPage() {
  const [tab, setTab] = React.useState<"all" | "PENDING" | "SELECTED" | "REJECTED">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-bids"],
    queryFn: () => api.get<{ content: MyBid[] }>("/bids/mine?size=50"),
  });

  const bids = data?.content ?? [];
  const filtered = tab === "all" ? bids : bids.filter((b) => b.status === tab);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            내 입찰 현황
          </h1>
          <p className="mt-1 text-sm text-neutral-400">제출한 견적 입찰의 진행 상황을 확인하세요</p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-neutral-100 p-1">
          {TABS.map((t) => {
            const cnt = t.key === "all" ? bids.length : bids.filter((b) => b.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                  tab === t.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {t.label}
                {cnt > 0 && <span className="ml-1 text-neutral-400">({cnt})</span>}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-white p-5">
                <div className="mb-3 h-4 w-3/4 rounded bg-neutral-100" />
                <div className="h-16 rounded-lg bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-neutral-200" />
            <p className="font-semibold text-neutral-600">입찰 내역이 없습니다</p>
            <p className="mt-1 text-sm text-neutral-400">관심 있는 공고에 견적을 제출해보세요</p>
            <Link
              href="/jobs"
              className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              공고 보러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((bid) => <BidCard key={bid.publicId} bid={bid} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
