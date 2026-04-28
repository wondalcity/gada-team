"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ClipboardSignature,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { contractsApi } from "@/lib/contracts-api";
import { AppLayout } from "@/components/layout/AppLayout";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployerContractTemplatePage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    payAmount: "",
    payUnit: "DAILY",
    terms: "",
    documentUrl: "",
  });

  const { data: template, isLoading } = useQuery({
    queryKey: ["employer-contract-template"],
    queryFn: () => contractsApi.getTemplate(),
    retry: false,
  });

  // Populate form when template loads
  React.useEffect(() => {
    if (template) {
      setForm({
        payAmount: template.payAmount ? String(template.payAmount) : "",
        payUnit: template.payUnit ?? "DAILY",
        terms: template.terms ?? "",
        documentUrl: template.documentUrl ?? "",
      });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: () =>
      contractsApi.upsertTemplate({
        payAmount: form.payAmount ? Number(form.payAmount) : undefined,
        payUnit: form.payUnit || undefined,
        terms: form.terms || undefined,
        documentUrl: form.documentUrl || undefined,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["employer-contract-template"], data);
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.message ?? err?.message ?? "저장에 실패했어요.");
    },
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/employer/applicants"
            className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <ClipboardSignature className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-neutral-950">계약서 양식 관리</h1>
              <p className="text-sm text-neutral-500">채용 확정 후 계약서 발송 시 자동으로 채워지는 기본 양식이에요</p>
            </div>
          </div>
        </div>

        {/* Success banner */}
        {saved && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-50 border border-success-200 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0" />
            <p className="text-sm font-medium text-success-700">계약서 양식이 저장되었습니다.</p>
          </div>
        )}

        {/* Error banner */}
        {saveError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger-50 border border-danger-200 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{saveError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-100 bg-white shadow-card-md overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-bold text-neutral-800">기본 계약 조건</h2>
              <p className="text-xs text-neutral-500 mt-0.5">입력한 내용은 계약서 발송 시 양식으로 자동 채워져요</p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Pay */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                    급여 (원)
                  </label>
                  <input
                    type="number"
                    value={form.payAmount}
                    onChange={(e) => setForm((f) => ({ ...f, payAmount: e.target.value }))}
                    placeholder="예: 200000"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-700">단위</label>
                  <select
                    value={form.payUnit}
                    onChange={(e) => setForm((f) => ({ ...f, payUnit: e.target.value }))}
                    className="h-[42px] rounded-lg border border-neutral-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="DAILY">일급</option>
                    <option value="MONTHLY">월급</option>
                    <option value="HOURLY">시급</option>
                  </select>
                </div>
              </div>

              {/* Terms */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                  계약 조건 (선택)
                </label>
                <textarea
                  value={form.terms}
                  onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                  rows={5}
                  placeholder={`예)\n• 근무시간: 오전 8시 ~ 오후 5시\n• 식사 제공\n• 산재보험 적용\n• 안전장비 지급`}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                />
              </div>

              {/* Document URL */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                  계약서 문서 URL (선택)
                </label>
                <input
                  type="url"
                  value={form.documentUrl}
                  onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                  placeholder="https://docs.google.com/... (Google Docs, PDF 등)"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Google Docs, PDF 링크 등 계약서 원본 문서 URL을 입력하세요
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "저장 중..." : "양식 저장"}
              </button>
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
          <p className="text-xs font-semibold text-primary-700 mb-1">채팅으로 계약서 발송</p>
          <p className="text-xs text-primary-600 leading-relaxed">
            채용 확정 후 계약서를 발송하면 팀 채팅방에 계약서 메시지가 자동으로 전송됩니다.
            근로자는 채팅 또는 지원 현황 페이지에서 계약서를 확인하고 서명할 수 있어요.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
