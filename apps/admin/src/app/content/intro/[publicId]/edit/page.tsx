"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { IntroContentForm } from "@/components/content/IntroContentForm";
import { getAdminIntroContent, IntroContentResponse } from "@/lib/api";

// ─── Loading skeleton ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-neutral-200 rounded-lg" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-neutral-100 rounded" />
              <div className="h-9 bg-neutral-100 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <div className="h-5 w-24 bg-neutral-200 rounded" />
          <div className="h-48 bg-neutral-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function EditIntroContentPage() {
  const params = useParams();
  const publicId = params.publicId as string;

  const { data, isLoading, isError } = useQuery<IntroContentResponse>({
    queryKey: ["admin", "content", "intro", publicId],
    queryFn: () => getAdminIntroContent(publicId),
  });

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "콘텐츠 관리", href: "/content" },
    { label: "직종 소개글", href: "/content/intro" },
    { label: data?.title ?? "소개글 편집" },
  ];

  if (isLoading) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  if (isError || !data) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle className="h-10 w-10 text-neutral-300" />
          <p className="text-neutral-500 font-medium">소개글을 찾을 수 없습니다</p>
          <Link href="/content/intro" className="text-sm text-brand-blue hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <IntroContentForm existing={data} />
    </AdminLayout>
  );
}
