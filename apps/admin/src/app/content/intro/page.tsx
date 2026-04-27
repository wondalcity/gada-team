"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Pagination } from "@/components/ui/Pagination";
import {
  getAdminIntroContents,
  getAdminCategories,
  publishIntroContent,
  unpublishIntroContent,
  deleteIntroContent,
  IntroContentResponse,
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

function ContentStatusBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
      게시됨
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      초안
    </span>
  );
}

const PAGE_SIZE = 20;

export default function IntroListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [localeFilter, setLocaleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", "intro", page],
    queryFn: () => getAdminIntroContents(page),
  });

  const { data: categories } = useQuery<AdminCategoryItem[]>({
    queryKey: ["admin", "content", "categories"],
    queryFn: getAdminCategories,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishIntroContent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content", "intro"] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => unpublishIntroContent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content", "intro"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIntroContent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content", "intro"] }),
  });

  function handleDelete(item: IntroContentResponse) {
    if (confirm(`"${item.title}" 소개글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      deleteMutation.mutate(item.publicId);
    }
  }

  function handleTogglePublish(item: IntroContentResponse) {
    if (item.isPublished) {
      unpublishMutation.mutate(item.publicId);
    } else {
      publishMutation.mutate(item.publicId);
    }
  }

  const allContent: IntroContentResponse[] = data?.content ?? [];

  // Client-side filter (data is paginated from server; apply locale/category/published filters)
  const filtered = allContent.filter((item) => {
    if (localeFilter && item.locale !== localeFilter) return false;
    if (categoryFilter && item.categoryCode !== categoryFilter) return false;
    if (publishedFilter === "published" && !item.isPublished) return false;
    if (publishedFilter === "draft" && item.isPublished) return false;
    return true;
  });

  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "콘텐츠 관리", href: "/content" },
        { label: "직종 소개글" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">직종 소개글 관리</h1>
            <p className="mt-1 text-sm text-neutral-500">
              직종별 업무 소개 콘텐츠를 작성하고 관리합니다
            </p>
          </div>
          <Link
            href="/content/intro/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            새 소개글 작성
          </Link>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          {/* Filter bar */}
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
              <option value="">전체 직종</option>
              {(categories ?? []).map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.nameKo} ({cat.code})
                </option>
              ))}
            </select>

            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white text-neutral-700"
            >
              <option value="">전체 상태</option>
              <option value="published">게시됨</option>
              <option value="draft">초안</option>
            </select>

            <span className="ml-auto text-xs text-neutral-400">
              총 {totalElements.toLocaleString("ko-KR")}건
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    언어
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                    수정일
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-5 w-20 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-10 bg-neutral-100 rounded-full" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-48 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-14 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="h-5 w-20 bg-neutral-100 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-5 w-24 bg-neutral-100 rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-400">
                        소개글이 없습니다
                      </td>
                    </tr>
                  )
                  : filtered.map((item) => (
                      <tr key={item.publicId} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-mono font-semibold text-neutral-700">
                            {item.categoryCode}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <LocaleBadge locale={item.locale} />
                        </td>
                        <td className="px-4 py-3.5">
                          <p
                            className="font-medium text-neutral-900 max-w-[240px] truncate"
                            title={item.title}
                          >
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-neutral-400 mt-0.5 max-w-[240px] truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <ContentStatusBadge isPublished={item.isPublished} />
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-neutral-500">
                            {fmtDatetime(item.updatedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/content/intro/${item.publicId}/edit`}
                              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                            >
                              <Edit className="h-3 w-3" />
                              편집
                            </Link>
                            <button
                              onClick={() => handleTogglePublish(item)}
                              disabled={publishMutation.isPending || unpublishMutation.isPending}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                item.isPublished
                                  ? "border-orange-200 text-orange-700 hover:bg-orange-50"
                                  : "border-green-200 text-green-700 hover:bg-green-50"
                              }`}
                            >
                              {item.isPublished ? (
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
                              onClick={() => handleDelete(item)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
