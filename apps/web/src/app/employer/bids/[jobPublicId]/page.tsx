"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, User, Users, CheckCircle2, Clock, XCircle,
  AlertCircle, ChevronLeft, Trophy, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BidItem {
  publicId: string;
  bidderType: "WORKER" | "TEAM";
  bidAmount: number;
  message?: string;
  status: "PENDING" | "SELECTED" | "REJECTED";
  selectedAt?: string;
  createdAt: string;
  worker?: { publicId: string; fullName: string; nationality: string; visaType: string; profileImageUrl: string | null };
  team?: { publicId: string; name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

const STATUS_CFG = {
  PENDING:  { label: "검토 중", icon: Clock,        cls: "bg-warning-50 text-warning-700 border-warning-200" },
  SELECTED: { label: "선정됨", icon: CheckCircle2,  cls: "bg-success-50 text-success-700 border-success-200" },
  REJECTED: { label: "미선정", icon: XCircle,       cls: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

// ─── BidCard ──────────────────────────────────────────────────────────────────

function BidCard({
  bid,
  jobPublicId,
  hasSelected,
}: {
  bid: BidItem;
  jobPublicId: string;
  hasSelected: boolean;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const selectMutation = useMutation({
    mutationFn: () =>
      api.post(`/jobs/${jobPublicId}/bids/${bid.publicId}/select`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer-bids", jobPublicId] });
      setConfirmOpen(false);
    },
  });

  const cfg = STATUS_CFG[bid.status];
  const Icon = cfg.icon;
  const bidderName = bid.bidderType === "TEAM"
    ? (bid.team?.name ?? "팀")
    : (bid.worker?.fullName ?? "근로자");

  return (
    <>
      <div className={cn(
        "rounded-xl border p-5 transition-all",
        bid.status === "SELECTED" && "border-success-300 bg-success-50/40",
        bid.status === "PENDING" && "border-neutral-200 bg-white hover:border-primary-200",
        bid.status === "REJECTED" && "border-neutral-100 bg-white opacity-60",
      )}>
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100">
              {bid.bidderType === "TEAM"
                ? <Users className="h-5 w-5 text-neutral-500" />
                : <User className="h-5 w-5 text-neutral-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{bidderName}</p>
              <p className="text-xs text-neutral-400">{bid.bidderType === "TEAM" ? "팀 입찰" : "개인 입찰"}</p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold flex-shrink-0", cfg.cls)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
          <span className="text-xs text-neutral-500">제안 금액</span>
          <span className="text-lg font-bold text-primary-600">{formatVND(bid.bidAmount)}</span>
        </div>

        {/* Message */}
        {bid.message && (
          <div className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-500">
              <MessageSquare className="h-3 w-3" />견적 메시지
            </p>
            <p className="text-sm text-neutral-700 whitespace-pre-line">{bid.message}</p>
          </div>
        )}

        {/* Select button */}
        {bid.status === "PENDING" && !hasSelected && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="mt-4 w-full rounded-lg bg-primary-500 py-2.5 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
          >
            이 입찰 선정하기
          </button>
        )}
        {bid.status === "SELECTED" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-100 px-3 py-2 text-sm font-bold text-success-700">
            <Trophy className="h-4 w-4" />
            최종 선정된 입찰입니다
          </div>
        )}

        <p className="mt-3 text-right text-xs text-neutral-300">
          {new Date(bid.createdAt).toLocaleDateString("ko-KR")}
        </p>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-neutral-900">입찰 선정 확인</h3>
            <p className="text-sm text-neutral-500 mb-1">
              <span className="font-semibold text-neutral-800">{bidderName}</span>의 입찰을 선정하시겠습니까?
            </p>
            <p className="text-sm text-neutral-500 mb-5">
              제안 금액: <span className="font-bold text-primary-600">{formatVND(bid.bidAmount)}</span>
            </p>
            <p className="mb-5 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
              선정 후 다른 입찰자에게 미선정 알림이 발송됩니다.
            </p>
            {selectMutation.isError && (
              <p className="mb-3 text-xs text-danger-600">선정 처리에 실패했습니다. 다시 시도해주세요.</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600">
                취소
              </button>
              <button
                onClick={() => selectMutation.mutate()}
                disabled={selectMutation.isPending}
                className="flex-1 rounded-lg bg-primary-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {selectMutation.isPending ? "처리 중..." : "선정하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployerJobBidsPage({
  params,
}: {
  params: Promise<{ jobPublicId: string }>;
}) {
  const { jobPublicId } = React.use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["employer-bids", jobPublicId],
    queryFn: () =>
      api.get<{ content: BidItem[]; totalElements: number }>(
        `/jobs/${jobPublicId}/bids?size=50`
      ),
  });

  const bids = data?.content ?? [];
  const hasSelected = bids.some((b) => b.status === "SELECTED");
  const selected = bids.find((b) => b.status === "SELECTED");
  const pending = bids.filter((b) => b.status === "PENDING");
  const rejected = bids.filter((b) => b.status === "REJECTED");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/employer/bids" className="rounded-lg p-1.5 hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5 text-neutral-500" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            입찰 목록
          </h1>
          <p className="text-xs text-neutral-400">총 {bids.length}건의 입찰</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-white p-5">
              <div className="mb-3 flex gap-3"><div className="h-10 w-10 rounded-full bg-neutral-100" /><div className="flex-1"><div className="h-4 w-1/3 rounded bg-neutral-100 mb-1" /><div className="h-3 w-1/4 rounded bg-neutral-100" /></div></div>
              <div className="h-14 rounded-lg bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-neutral-200" />
          <p className="font-semibold text-neutral-600">아직 입찰이 없습니다</p>
          <p className="mt-1 text-sm text-neutral-400">근로자나 팀이 견적을 제출하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected */}
          {selected && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-success-600">✅ 선정됨</h2>
              <BidCard bid={selected} jobPublicId={jobPublicId} hasSelected={hasSelected} />
            </section>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
                검토 중 ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.map((b) => (
                  <BidCard key={b.publicId} bid={b} jobPublicId={jobPublicId} hasSelected={hasSelected} />
                ))}
              </div>
            </section>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
                미선정 ({rejected.length})
              </h2>
              <div className="space-y-4">
                {rejected.map((b) => (
                  <BidCard key={b.publicId} bid={b} jobPublicId={jobPublicId} hasSelected={hasSelected} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
