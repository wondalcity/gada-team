"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  getAdminSmsTemplateDetail,
  updateSmsTemplate,
  AdminSmsTemplateItem,
} from "@/lib/api";

// ─── Page ─────────────────────────────────────────────────────

export default function EditSmsTemplatePage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("ko");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState<string[]>([""]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading, error } = useQuery<AdminSmsTemplateItem>({
    queryKey: ["admin", "sms-template", publicId],
    queryFn: () => getAdminSmsTemplateDetail(publicId),
  });

  // Pre-fill form when data loads
  useEffect(() => {
    if (data && !initialized) {
      setCode(data.code);
      setName(data.name);
      setLocale(data.locale);
      setContent(data.content);
      setVariables(data.variables.length > 0 ? data.variables : [""]);
      setIsActive(data.isActive);
      setInitialized(true);
    }
  }, [data, initialized]);

  const mutation = useMutation({
    mutationFn: () =>
      updateSmsTemplate(publicId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        locale,
        content,
        variables: variables.map((v) => v.trim()).filter(Boolean),
        isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sms-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sms-template", publicId] });
      router.push("/sms-templates");
    },
    onError: (err) => setFormError((err as Error).message),
  });

  function addVariable() {
    setVariables((prev) => [...prev, ""]);
  }

  function removeVariable(idx: number) {
    setVariables((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateVariable(idx: number, val: string) {
    setVariables((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !content.trim()) {
      setFormError("코드, 이름, 내용은 필수입니다.");
      return;
    }
    setFormError("");
    mutation.mutate();
  }

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "SMS 템플릿", href: "/sms-templates" },
    { label: "템플릿 편집" },
  ];

  if (isLoading) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-2xl space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-neutral-200 rounded-lg" />
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-neutral-100 rounded" />
                <div className="h-10 bg-neutral-100 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle className="h-10 w-10 text-neutral-300" />
          <p className="text-neutral-500 font-medium">템플릿을 찾을 수 없습니다</p>
          <Link href="/sms-templates" className="text-sm text-brand-blue hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-2xl space-y-6">
        {/* Back */}
        <Link
          href="/sms-templates"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          SMS 템플릿 목록
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">SMS 템플릿 편집</h1>
          <p className="mt-1 text-sm text-neutral-500 font-mono">{data.code}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6 space-y-5">
          {/* Code */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              코드 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: WELCOME_KO"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue uppercase"
            />
            <p className="text-[11px] text-neutral-400 mt-1">대문자 및 밑줄(_) 사용 권장</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 가입 환영 메시지"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Locale */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">언어</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
            >
              <option value="ko">한국어 (ko)</option>
              <option value="en">English (en)</option>
              <option value="vi">Tiếng Việt (vi)</option>
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-y font-mono"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              변수는 {"{{name}}"} 형식으로 입력하세요
            </p>
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-600">변수 목록</label>
              <button
                type="button"
                onClick={addVariable}
                className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark transition-colors font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                추가
              </button>
            </div>
            <div className="space-y-2">
              {variables.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v}
                    onChange={(e) => updateVariable(idx, e.target.value)}
                    placeholder={`변수명 예: name`}
                    className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-mono text-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariable(idx)}
                    disabled={variables.length === 1}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* isActive toggle */}
          <div className="flex items-center justify-between py-2 border-t border-neutral-100">
            <div>
              <p className="text-sm font-medium text-neutral-800">활성 상태</p>
              <p className="text-xs text-neutral-500">비활성 시 발송에 사용되지 않습니다</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-brand-blue" : "bg-neutral-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/sms-templates"
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
