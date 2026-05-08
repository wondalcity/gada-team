"use client";

import * as React from "react";
import { X, TrendingUp, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    publicId: string;
    title: string;
    payMin?: number;
    payMax?: number;
    payUnit: string;
  };
  myTeamPublicId?: string; // set if user is team leader bidding as team
  onSuccess?: () => void;
}

const PAY_UNIT_KO: Record<string, string> = {
  HOURLY: "시급", DAILY: "일급", WEEKLY: "주급", MONTHLY: "월급", LUMP_SUM: "일시불",
};

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

export function BidModal({ isOpen, onClose, job, myTeamPublicId, onSuccess }: BidModalProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [bidAs, setBidAs] = React.useState<"individual" | "team">(myTeamPublicId ? "team" : "individual");
  const [done, setDone] = React.useState(false);

  const mutation = useMutation({
    mutationFn: (body: { bidAmount: number; message: string; teamPublicId?: string }) =>
      api.post(`/jobs/${job.publicId}/bids`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-bids"] });
      setDone(true);
    },
  });

  React.useEffect(() => {
    if (!isOpen) { setAmount(""); setMessage(""); setDone(false); mutation.reset(); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(/[^0-9]/g, ""));
    if (!n || n <= 0) return;
    mutation.mutate({
      bidAmount: n,
      message: message.trim() || undefined,
      teamPublicId: bidAs === "team" ? myTeamPublicId : undefined,
    } as { bidAmount: number; message: string; teamPublicId?: string });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900">견적 입찰</h2>
            <p className="mt-0.5 text-xs text-neutral-400 line-clamp-1">{job.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100">
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10">
            <CheckCircle2 className="h-12 w-12 text-success-500" />
            <p className="text-base font-bold text-neutral-800">입찰이 등록되었습니다</p>
            <p className="text-sm text-neutral-400 text-center">기업 담당자가 검토 후 결과를 알려드립니다.</p>
            <button
              onClick={() => { onSuccess?.(); onClose(); }}
              className="mt-2 w-full rounded-lg bg-primary-500 py-3 text-sm font-bold text-white"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Pay range hint */}
            {(job.payMin || job.payMax) && (
              <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700">
                <span className="font-semibold">공고 금액 범위: </span>
                {job.payMin ? formatVND(job.payMin) : "–"}
                {job.payMax ? ` ~ ${formatVND(job.payMax)}` : ""}
                <span className="ml-1 text-xs text-primary-500">({PAY_UNIT_KO[job.payUnit] ?? job.payUnit})</span>
              </div>
            )}

            {/* Bid as (individual / team) */}
            {myTeamPublicId && (
              <div>
                <p className="mb-2 text-xs font-semibold text-neutral-500">입찰 유형</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["individual", "team"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBidAs(v)}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-semibold transition-all",
                        bidAs === v
                          ? "border-primary-500 bg-primary-50 text-primary-600"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      )}
                    >
                      {v === "individual" ? "개인 입찰" : "팀 입찰"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
                제안 금액 (VND) <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="예: 250000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                required
              />
              {amount && (
                <p className="mt-1 text-xs text-neutral-400">{formatVND(Number(amount))}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                <MessageSquare className="inline h-3.5 w-3.5 mr-1" />
                견적 메시지 (선택)
              </label>
              <textarea
                rows={3}
                placeholder="경력, 강점, 일정 등 어필할 내용을 작성하세요"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none rounded-lg border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                maxLength={500}
              />
              <p className="mt-0.5 text-right text-xs text-neutral-300">{message.length}/500</p>
            </div>

            {mutation.isError && (
              <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2.5 text-sm text-danger-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>입찰 등록에 실패했습니다. 다시 시도해주세요.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending || !amount}
              className="w-full rounded-lg bg-primary-500 py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-primary-600 transition-colors"
            >
              {mutation.isPending ? "등록 중..." : "입찰 등록하기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
