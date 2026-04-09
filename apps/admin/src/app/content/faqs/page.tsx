"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, X } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  getAdminFaqs,
  getAdminCategories,
  createFaq,
  updateFaq,
  deleteFaq,
  publishFaq,
  FaqResponse,
  AdminCategoryItem,
} from "@/lib/api";

// ─── Locale Badge ──────────────────────────────────────────────

const LOCALE_CLASS: Record<string, string> = {
  ko: "bg-blue-100 text-blue-700",
  en: "bg-green-100 text-green-700",
  vi: "bg-orange-100 text-orange-700",
};

function LocaleBadge({ locale }: { locale: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${LOCALE_CLASS[locale] ?? "bg-neutral-100 text-neutral-600"}`}
    >
      {locale}
    </span>
  );
}

// ─── Inline Edit/Create Form ───────────────────────────────────

interface FaqFormState {
  question: string;
  answer: string;
  sortOrder: string;
  locale: string;
  categoryCode: string;
}

function emptyForm(): FaqFormState {
  return { question: "", answer: "", sortOrder: "0", locale: "ko", categoryCode: "" };
}

function faqToForm(faq: FaqResponse): FaqFormState {
  return {
    question: faq.question,
    answer: faq.answer,
    sortOrder: String(faq.sortOrder),
    locale: faq.locale,
    categoryCode: faq.categoryCode ?? "",
  };
}

interface FaqInlineFormProps {
  initial?: FaqFormState;
  categories: AdminCategoryItem[];
  onSave: (form: FaqFormState) => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew?: boolean;
}

function FaqInlineForm({
  initial,
  categories,
  onSave,
  onCancel,
  isSaving,
  isNew,
}: FaqInlineFormProps) {
  const [form, setForm] = useState<FaqFormState>(initial ?? emptyForm());

  const inputCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue";
  const textareaCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none";

  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-700">
          {isNew ? "새 FAQ 추가" : "FAQ 편집"}
        </p>
        <button
          onClick={onCancel}
          className="h-7 w-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Locale */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">언어</label>
          <select
            value={form.locale}
            onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
            className={inputCls}
            disabled={!isNew}
          >
            <option value="ko">한국어 (ko)</option>
            <option value="en">영어 (en)</option>
            <option value="vi">베트남어 (vi)</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">카테고리</label>
          <select
            value={form.categoryCode}
            onChange={(e) => setForm((f) => ({ ...f, categoryCode: e.target.value }))}
            className={inputCls}
          >
            <option value="">카테고리 없음</option>
            {categories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.nameKo}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">정렬 순서</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            className={inputCls}
            min="0"
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          질문 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          rows={2}
          placeholder="자주 묻는 질문을 입력하세요"
          className={textareaCls}
        />
      </div>

      {/* Answer */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          답변 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.answer}
          onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          rows={4}
          placeholder="답변을 입력하세요"
          className={textareaCls}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-white transition-colors"
        >
          취소
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={isSaving || !form.question.trim() || !form.answer.trim()}
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function FaqsPage() {
  const queryClient = useQueryClient();

  const [localeFilter, setLocaleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: faqData, isLoading } = useQuery({
    queryKey: ["admin", "content", "faqs", localeFilter, categoryFilter],
    queryFn: () =>
      getAdminFaqs({
        locale: localeFilter || undefined,
        categoryCode: categoryFilter || undefined,
        page: 0,
      }),
  });

  const { data: categories } = useQuery<AdminCategoryItem[]>({
    queryKey: ["admin", "content", "categories"],
    queryFn: getAdminCategories,
  });

  const createMutation = useMutation({
    mutationFn: (form: FaqFormState) =>
      createFaq({
        locale: form.locale,
        categoryCode: form.categoryCode || undefined,
        question: form.question.trim(),
        answer: form.answer.trim(),
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "faqs"] });
      setShowNewForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: FaqFormState }) =>
      updateFaq(id, {
        question: form.question.trim(),
        answer: form.answer.trim(),
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "faqs"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFaq(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content", "faqs"] }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishFaq(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content", "faqs"] }),
  });

  function handleDelete(faq: FaqResponse) {
    if (confirm(`FAQ를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      deleteMutation.mutate(faq.publicId);
    }
  }

  const faqs: FaqResponse[] = faqData?.content ?? [];
  const totalElements = faqData?.totalElements ?? 0;

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "콘텐츠 관리", href: "/content" },
        { label: "FAQ" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">FAQ 관리</h1>
            <p className="mt-1 text-sm text-neutral-500">자주 묻는 질문을 관리합니다</p>
          </div>
          <button
            onClick={() => { setShowNewForm(true); setEditingId(null); }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            새 FAQ 추가
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap gap-3 items-center">
            <select
              value={localeFilter}
              onChange={(e) => setLocaleFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
            >
              <option value="">전체 언어</option>
              <option value="ko">한국어 (ko)</option>
              <option value="en">영어 (en)</option>
              <option value="vi">베트남어 (vi)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
            >
              <option value="">전체 카테고리</option>
              {(categories ?? []).map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.nameKo}
                </option>
              ))}
            </select>

            <span className="ml-auto text-xs text-neutral-400">
              총 {totalElements.toLocaleString("ko-KR")}건
            </span>
          </div>

          {/* New form at top */}
          {showNewForm && (
            <div className="px-6 py-5 border-b border-blue-100">
              <FaqInlineForm
                categories={categories ?? []}
                onSave={(form) => createMutation.mutate(form)}
                onCancel={() => setShowNewForm(false)}
                isSaving={createMutation.isPending}
                isNew
              />
            </div>
          )}

          {/* List */}
          <div className="divide-y divide-neutral-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 animate-pulse flex gap-4 items-start">
                    <div className="h-5 w-8 bg-neutral-100 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-neutral-100 rounded" />
                      <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                    </div>
                  </div>
                ))
              : faqs.length === 0
              ? (
                <div className="px-6 py-12 text-center text-sm text-neutral-400">
                  FAQ가 없습니다. 새로 추가해주세요.
                </div>
              )
              : faqs.map((faq) => (
                  <div key={faq.publicId}>
                    {editingId === faq.publicId ? (
                      <div className="px-6 py-5">
                        <FaqInlineForm
                          initial={faqToForm(faq)}
                          categories={categories ?? []}
                          onSave={(form) =>
                            updateMutation.mutate({ id: faq.publicId, form })
                          }
                          onCancel={() => setEditingId(null)}
                          isSaving={updateMutation.isPending}
                        />
                      </div>
                    ) : (
                      <div className="px-6 py-4">
                        {/* Row */}
                        <div className="flex items-start gap-4">
                          {/* Expand toggle */}
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === faq.publicId ? null : faq.publicId)
                            }
                            className="mt-0.5 h-6 w-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0"
                          >
                            {expandedId === faq.publicId ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <LocaleBadge locale={faq.locale} />
                              {faq.categoryCode && (
                                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-mono font-semibold text-neutral-600">
                                  {faq.categoryCode}
                                </span>
                              )}
                              {faq.isPublished ? (
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                  게시됨
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                                  초안
                                </span>
                              )}
                              <span className="text-xs text-neutral-400">
                                순서 {faq.sortOrder}
                              </span>
                            </div>
                            <p
                              className="text-sm font-medium text-neutral-900 truncate"
                              title={faq.question}
                            >
                              {faq.question}
                            </p>
                            {expandedId === faq.publicId && (
                              <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed">
                                {faq.answer}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEditingId(faq.publicId)}
                              className="inline-flex items-center rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                            >
                              편집
                            </button>
                            <button
                              onClick={() => publishMutation.mutate(faq.publicId)}
                              disabled={publishMutation.isPending}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                faq.isPublished
                                  ? "border-orange-200 text-orange-700 hover:bg-orange-50"
                                  : "border-green-200 text-green-700 hover:bg-green-50"
                              }`}
                            >
                              {faq.isPublished ? (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  게시취소
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" />
                                  게시
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(faq)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
