"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, RefreshCw, CheckCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  PagedResponse,
  getAdminUsers,
  assignAdminRole,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ADMIN_ROLES = [
  { label: "없음", value: "" },
  { label: "슈퍼관리자", value: "SUPER_ADMIN" },
  { label: "운영관리자", value: "OPERATIONS_ADMIN" },
  { label: "콘텐츠관리자", value: "CONTENT_ADMIN" },
  { label: "정산관리자", value: "SETTLEMENT_ADMIN" },
];

// ─── Role badge ───────────────────────────────────────────────

type AdminUserRow = { publicId: string; phone: string; status: string; adminRole: string | null; createdAt: string };

function AdminRoleBadge({ role }: { role: string | null }) {
  if (!role) return <AdminBadge label="미지정" variant="gray" />;
  const MAP: Record<string, { label: string; variant: "red" | "blue" | "green" | "amber" }> = {
    SUPER_ADMIN: { label: "슈퍼관리자", variant: "red" },
    OPERATIONS_ADMIN: { label: "운영관리자", variant: "blue" },
    CONTENT_ADMIN: { label: "콘텐츠관리자", variant: "green" },
    SETTLEMENT_ADMIN: { label: "정산관리자", variant: "amber" },
  };
  const cfg = MAP[role];
  if (!cfg) return <AdminBadge label={role} variant="gray" />;
  return <AdminBadge label={cfg.label} variant={cfg.variant} />;
}

// ─── Role change cell ─────────────────────────────────────────

function RoleChangeCell({
  row,
  onSuccess,
}: {
  row: AdminUserRow;
  onSuccess: () => void;
}) {
  const [selected, setSelected] = useState(row.adminRole ?? "");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => assignAdminRole(row.publicId, selected || null),
    onSuccess: () => {
      onSuccess();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const changed = selected !== (row.adminRole ?? "");

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setSaved(false); }}
        className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
      >
        {ADMIN_ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {changed && (
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-2.5 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? "..." : "변경"}
        </button>
      )}
      {saved && (
        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function AdminsPage() {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PagedResponse<AdminUserRow>>({
    queryKey: ["admin", "admins", page],
    queryFn: () => getAdminUsers({ page, size: PAGE_SIZE }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const COLUMNS: Column<AdminUserRow>[] = [
    {
      key: "phone",
      header: "전화번호",
      render: (row) => (
        <p className="font-medium text-neutral-900">{row.phone}</p>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "adminRole",
      header: "현재 역할",
      render: (row) => <AdminRoleBadge role={row.adminRole} />,
    },
    {
      key: "roleChange",
      header: "역할 변경",
      render: (row) => (
        <RoleChangeCell
          row={row}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin", "admins"] })}
        />
      ),
    },
    {
      key: "createdAt",
      header: "가입일",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {fmtDatetime(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "설정" },
        { label: "관리자 권한" },
      ]}
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
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">관리자 권한 설정</h1>
          <p className="mt-1 text-sm text-neutral-500">
            관리자 사용자의 역할을 지정합니다.
          </p>
        </div>

        {/* Role legend */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-5">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">역할 설명</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { role: "SUPER_ADMIN", desc: "전체 접근 권한" },
              { role: "OPERATIONS_ADMIN", desc: "운영 및 인력 관리" },
              { role: "CONTENT_ADMIN", desc: "콘텐츠 및 FAQ" },
              { role: "SETTLEMENT_ADMIN", desc: "정산 및 계약" },
            ].map(({ role, desc }) => (
              <div key={role} className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <AdminRoleBadge role={role} />
                  <p className="text-[11px] text-neutral-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">관리자 목록</h2>
            <p className="text-xs text-neutral-400">총 {totalElements.toLocaleString("ko-KR")}명</p>
          </div>

          <DataTable<AdminUserRow>
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
