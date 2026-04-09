"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminCompany, AdminUpsertCompanyPayload } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"];

export default function CompanyNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AdminUpsertCompanyPayload>({ name: "", status: "ACTIVE" });

  function set(k: keyof AdminUpsertCompanyPayload, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("기업명을 입력하세요."); return; }
    setLoading(true); setError("");
    try {
      const { publicId } = await createAdminCompany(form);
      router.push(`/companies/${publicId}`);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "건설사", href: "/companies" }, { label: "건설사 등록" }]}>
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">건설사 등록</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <Field label="기업명 *"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={INPUT} placeholder="(주)GADA건설" /></Field>
        <Field label="사업자등록번호"><input value={form.businessRegistrationNumber ?? ""} onChange={(e) => set("businessRegistrationNumber", e.target.value)} className={INPUT} placeholder="123-45-67890" /></Field>
        <Field label="대표자명"><input value={form.ceoName ?? ""} onChange={(e) => set("ceoName", e.target.value)} className={INPUT} placeholder="홍길동" /></Field>
        <Field label="주소"><input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className={INPUT} placeholder="서울시 강남구..." /></Field>
        <Field label="전화번호"><input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={INPUT} placeholder="02-0000-0000" /></Field>
        <Field label="이메일"><input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={INPUT} placeholder="contact@company.com" /></Field>
        <Field label="홈페이지"><input value={form.websiteUrl ?? ""} onChange={(e) => set("websiteUrl", e.target.value)} className={INPUT} placeholder="https://company.com" /></Field>
        <Field label="회사 소개">
          <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} className={INPUT} placeholder="회사 소개..." />
        </Field>
        <Field label="상태">
          <select value={form.status ?? "ACTIVE"} onChange={(e) => set("status", e.target.value)} className={INPUT}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "등록 중…" : "건설사 등록"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400";
