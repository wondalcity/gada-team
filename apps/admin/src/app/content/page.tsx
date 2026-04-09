"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, HelpCircle, Tag, ArrowRight, Edit } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  getAdminIntroContents,
  getAdminFaqs,
  getAdminCategories,
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

// ─── Status Badge ──────────────────────────────────────────────

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

// ─── Hub Card ──────────────────────────────────────────────────

interface HubCardProps {
  icon: React.ReactNode;
  title: string;
  stat: React.ReactNode;
  description: string;
  href: string;
  color: string;
}

function HubCard({ icon, title, stat, description, href, color }: HubCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs text-neutral-500 font-medium mb-1">{title}</p>
        <div className="text-2xl font-extrabold text-neutral-900">{stat}</div>
        <p className="text-xs text-neutral-400 mt-1">{description}</p>
      </div>
      <Link
        href={href}
        className="mt-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
      >
        관리하기
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function ContentHubPage() {
  const { data: introData, isLoading: introLoading } = useQuery({
    queryKey: ["admin", "content", "intro", 0],
    queryFn: () => getAdminIntroContents(0),
  });

  const { data: faqData, isLoading: faqLoading } = useQuery({
    queryKey: ["admin", "content", "faqs"],
    queryFn: () => getAdminFaqs({ page: 0 }),
  });

  const { data: categories, isLoading: catLoading } = useQuery<AdminCategoryItem[]>({
    queryKey: ["admin", "content", "categories"],
    queryFn: getAdminCategories,
  });

  const introContents: IntroContentResponse[] = introData?.content ?? [];
  const introTotal = introData?.totalElements ?? 0;
  const introPublished = introContents.filter((c) => c.isPublished).length;

  const faqTotal = faqData?.totalElements ?? 0;
  const faqPublished = (faqData?.content ?? []).filter((f) => f.isPublished).length;

  const catTotal = categories?.length ?? 0;
  const catActive = (categories ?? []).filter((c) => c.isActive).length;

  // Last 5 updated intro contents
  const recentIntros = [...introContents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const LoadingNumber = () => (
    <span className="inline-block h-7 w-16 rounded-md bg-neutral-100 animate-pulse" />
  );

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "콘텐츠 관리" },
      ]}
    >
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">콘텐츠 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            직종 소개글, FAQ, 카테고리를 관리합니다
          </p>
        </div>

        {/* Hub cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HubCard
            icon={<BookOpen className="h-5 w-5 text-brand-blue" />}
            title="직종 소개글"
            color="bg-brand-blue/10"
            stat={
              introLoading ? (
                <LoadingNumber />
              ) : (
                <span>
                  {introTotal.toLocaleString("ko-KR")}
                  <span className="text-sm font-medium text-neutral-400 ml-1">
                    건 ({introPublished} 게시됨)
                  </span>
                </span>
              )
            }
            description="직종별 업무 소개 콘텐츠"
            href="/content/intro"
          />
          <HubCard
            icon={<HelpCircle className="h-5 w-5 text-purple-600" />}
            title="FAQ"
            color="bg-purple-50"
            stat={
              faqLoading ? (
                <LoadingNumber />
              ) : (
                <span>
                  {faqTotal.toLocaleString("ko-KR")}
                  <span className="text-sm font-medium text-neutral-400 ml-1">
                    건 ({faqPublished} 게시됨)
                  </span>
                </span>
              )
            }
            description="자주 묻는 질문 관리"
            href="/content/faqs"
          />
          <HubCard
            icon={<Tag className="h-5 w-5 text-orange-500" />}
            title="직종 카테고리"
            color="bg-orange-50"
            stat={
              catLoading ? (
                <LoadingNumber />
              ) : (
                <span>
                  {catTotal.toLocaleString("ko-KR")}
                  <span className="text-sm font-medium text-neutral-400 ml-1">
                    개 ({catActive} 활성)
                  </span>
                </span>
              )
            }
            description="직종 분류 카테고리 관리"
            href="/content/categories"
          />
        </div>

        {/* Recent intro contents */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">최근 수정된 소개글</h2>
            <Link
              href="/content/intro"
              className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
            >
              전체 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {introLoading ? (
            <div className="divide-y divide-neutral-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-3 items-center">
                  <div className="h-5 w-16 bg-neutral-100 rounded" />
                  <div className="h-5 w-8 bg-neutral-100 rounded-full" />
                  <div className="h-5 flex-1 bg-neutral-100 rounded" />
                  <div className="h-5 w-12 bg-neutral-100 rounded" />
                </div>
              ))}
            </div>
          ) : recentIntros.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BookOpen className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">소개글이 없습니다</p>
            </div>
          ) : (
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentIntros.map((item) => (
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
                      <p className="font-medium text-neutral-900 max-w-[220px] truncate" title={item.title}>
                        {item.title}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <ContentStatusBadge isPublished={item.isPublished} />
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-neutral-500">
                        {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/content/intro/${item.publicId}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                        편집
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
