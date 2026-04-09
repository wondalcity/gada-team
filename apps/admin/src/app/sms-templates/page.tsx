"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MessageSquare, Plus, RefreshCw, Pencil } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { DeleteRestoreActions } from "@/components/ui/DeleteRestoreActions";
import { Pagination } from "@/components/ui/Pagination";
import {
  AdminSmsTemplateItem,
  PagedResponse,
  getAdminSmsTemplates,
  deleteSmsTemplate,
  restoreSmsTemplate,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Locale badge ─────────────────────────────────────────────

function LocaleBadge({ locale }: { locale: string }) {
  const MAP: Record<string, { label: string; variant: "blue" | "green" | "orange" }> = {
    ko: { label: "한국어", variant: "blue" },
    en: { label: "English", variant: "green" },
    vi: { label: "Tiếng Việt", variant: "orange" },
  };
  const cfg = MAP[locale];
  if (!cfg) return <AdminBadge label={locale} variant="gray" />;
  return <AdminBadge label={cfg.label} variant={cfg.variant} />;
}

// ─── Page ─────────────────────────────────────────────────────

export default function SmsTemplatesPage() {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PagedResponse<AdminSmsTemplateItem>>({
    queryKey: ["admin", "sms-templates", page],
    queryFn: () => getAdminSmsTemplates({ page, size: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteSmsTemplate(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sms-templates"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (publicId: string) => restoreSmsTemplate(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sms-templates"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const COLUMNS: Column<AdminSmsTemplateItem>[] = [
    {
      key: "code",
      header: "코드",
      render: (row) => (
        <span className="font-mono text-xs text-neutral-700 bg-neutral-100 rounded px-1.5 py-0.5">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "이름",
      render: (row) => (
        <p className="font-medium text-neutral-900 max-w-[180px] truncate" title={row.name}>
          {row.name}
        </p>
      ),
    },
    {
      key: "locale",
      header: "언어",
      render: (row) => <LocaleBadge locale={row.locale} />,
    },
    {
      key: "isActive",
      header: "활성",
      render: (row) => (
        <AdminBadge
          label={row.isActive ? "활성" : "비활성"}
          variant={row.isActive ? "green" : "gray"}
        />
      ),
    },
    {
      key: "variables",
      header: "변수",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.variables.length === 0 ? (
            <span className="text-neutral-300 text-xs">없음</span>
          ) : (
            row.variables.slice(0, 3).map((v) => (
              <span
                key={v}
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {"{{"}{v}{"}}"}
              </span>
            ))
          )}
          {row.variables.length > 3 && (
            <span className="text-xs text-neutral-400">+{row.variables.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "수정일",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {new Date(row.updatedAt).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "액션",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/sms-templates/${row.publicId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            편집
          </Link>
          <DeleteRestoreActions
            isDeleted={!row.isActive}
            onDelete={() => {
              if (confirm("SMS 템플릿을 삭제하시겠습니까?")) deleteMutation.mutate(row.publicId);
            }}
            onRestore={() => restoreMutation.mutate(row.publicId)}
            loading={deleteMutation.isPending || restoreMutation.isPending}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "SMS 템플릿" }]}
      actions={
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      }
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">SMS 템플릿</h1>
            <p className="mt-1 text-sm text-neutral-500">
              다국어 SMS 발송 템플릿을 관리합니다.
            </p>
          </div>
          <Link
            href="/sms-templates/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            새 템플릿
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 템플릿</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-16 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                totalElements.toLocaleString("ko-KR")
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">활성</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((t) => t.isActive).length
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">비활성</p>
            </div>
            <p className="text-2xl font-bold text-neutral-500">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                content.filter((t) => !t.isActive).length
              )}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">템플릿 목록</h2>
            <p className="text-xs text-neutral-400">총 {totalElements.toLocaleString("ko-KR")}개</p>
          </div>

          <DataTable<AdminSmsTemplateItem>
            columns={COLUMNS}
            data={content}
            loading={isLoading}
            skeletonRows={5}
            keyField="publicId"
          />

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
