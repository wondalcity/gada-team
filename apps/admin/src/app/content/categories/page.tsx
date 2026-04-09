"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, X } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  getAdminCategories,
  updateCategory,
  AdminCategoryItem,
} from "@/lib/api";

// ─── Edit Panel ────────────────────────────────────────────────

interface EditPanelProps {
  category: AdminCategoryItem;
  onClose: () => void;
}

interface EditFormState {
  nameEn: string;
  nameVi: string;
  iconUrl: string;
  isActive: boolean;
}

function EditPanel({ category, onClose }: EditPanelProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EditFormState>({
    nameEn: category.nameEn ?? "",
    nameVi: category.nameVi ?? "",
    iconUrl: category.iconUrl ?? "",
    isActive: category.isActive,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCategory(category.code, {
        nameEn: form.nameEn.trim() || null,
        nameVi: form.nameVi.trim() || null,
        iconUrl: form.iconUrl.trim() || null,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "categories"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const inputCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 bg-neutral-950/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-sm bg-white border-l border-neutral-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">카테고리 편집</h2>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">{category.code}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* nameKo — read-only */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              한국어 이름 <span className="text-neutral-400 font-normal">(읽기 전용)</span>
            </label>
            <input
              type="text"
              value={category.nameKo}
              disabled
              className="w-full rounded-xl border border-neutral-100 px-3 py-2 text-sm text-neutral-500 bg-neutral-50"
            />
          </div>

          {/* nameEn */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              영어 이름 (nameEn)
            </label>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              placeholder="English name"
              className={inputCls}
            />
          </div>

          {/* nameVi */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              베트남어 이름 (nameVi)
            </label>
            <input
              type="text"
              value={form.nameVi}
              onChange={(e) => setForm((f) => ({ ...f, nameVi: e.target.value }))}
              placeholder="Tên tiếng Việt"
              className={inputCls}
            />
          </div>

          {/* iconUrl */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              아이콘 URL
            </label>
            <input
              type="text"
              value={form.iconUrl}
              onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
              placeholder="https://..."
              className={inputCls}
            />
            {form.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.iconUrl}
                alt="아이콘 미리보기"
                className="mt-2 h-10 w-10 object-contain rounded-lg border border-neutral-200"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
          </div>

          {/* isActive */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-2">활성 상태</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? "bg-brand-blue" : "bg-neutral-200"
              }`}
              role="switch"
              aria-checked={form.isActive}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="ml-2 text-sm text-neutral-600">
              {form.isActive ? "활성" : "비활성"}
            </span>
          </div>

          {/* Content count — read-only info */}
          <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
            <p className="text-xs text-neutral-500">연결된 소개글</p>
            <p className="text-lg font-bold text-neutral-800 mt-0.5">
              {category.contentCount.toLocaleString("ko-KR")}건
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-neutral-100 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm disabled:opacity-50"
          >
            {updateMutation.isPending ? "저장 중..." : saved ? "저장됨!" : "저장"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null);

  const { data: categories, isLoading } = useQuery<AdminCategoryItem[]>({
    queryKey: ["admin", "content", "categories"],
    queryFn: getAdminCategories,
  });

  const cats = categories ?? [];
  const activeCount = cats.filter((c) => c.isActive).length;

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "콘텐츠 관리", href: "/content" },
        { label: "직종 카테고리" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">직종 카테고리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            직종 분류 카테고리를 관리합니다 — 총{" "}
            <span className="font-semibold text-neutral-700">{cats.length}</span>개 (활성{" "}
            <span className="font-semibold text-green-700">{activeCount}</span>개)
          </p>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    코드 / 아이콘
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    한국어 이름
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                    영어 (nameEn)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                    베트남어 (nameVi)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    활성
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                    소개글
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-5 w-24 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-20 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <div className="h-5 w-24 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="h-5 w-24 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-10 bg-neutral-100 rounded-full" />
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="h-5 w-8 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-7 w-12 bg-neutral-100 rounded-lg ml-auto" />
                        </td>
                      </tr>
                    ))
                  : cats.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-400">
                        카테고리가 없습니다
                      </td>
                    </tr>
                  )
                  : cats.map((cat) => (
                      <tr key={cat.code} className="hover:bg-neutral-50/50 transition-colors">
                        {/* Code + Icon */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            {cat.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cat.iconUrl}
                                alt=""
                                className="h-6 w-6 object-contain"
                                onError={(e) =>
                                  ((e.target as HTMLImageElement).style.display = "none")
                                }
                              />
                            ) : (
                              <Tag className="h-4 w-4 text-neutral-300" />
                            )}
                            <span className="font-mono text-xs font-semibold text-neutral-700">
                              {cat.code}
                            </span>
                          </div>
                        </td>

                        {/* nameKo */}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-neutral-900">{cat.nameKo}</span>
                        </td>

                        {/* nameEn */}
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className="text-neutral-600 text-xs">
                            {cat.nameEn ?? <span className="text-neutral-300">—</span>}
                          </span>
                        </td>

                        {/* nameVi */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-neutral-600 text-xs">
                            {cat.nameVi ?? <span className="text-neutral-300">—</span>}
                          </span>
                        </td>

                        {/* isActive */}
                        <td className="px-4 py-3.5">
                          {cat.isActive ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700">
                              활성
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-500">
                              비활성
                            </span>
                          )}
                        </td>

                        {/* contentCount */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-neutral-600">
                            {cat.contentCount}건
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end">
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                            >
                              편집
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-in edit panel */}
      {editingCategory && (
        <EditPanel
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </AdminLayout>
  );
}
