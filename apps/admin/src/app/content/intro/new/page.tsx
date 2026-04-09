"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { IntroContentForm } from "@/components/content/IntroContentForm";

export default function NewIntroContentPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "콘텐츠 관리", href: "/content" },
        { label: "직종 소개글", href: "/content/intro" },
        { label: "새 소개글" },
      ]}
    >
      <IntroContentForm />
    </AdminLayout>
  );
}
