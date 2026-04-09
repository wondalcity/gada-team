"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createAdminSite, AdminUpsertSitePayload } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>{children}</div>;
}

export default function SiteNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preCompanyId = searchParams.get("companyPublicId") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AdminUpsertSitePayload>({
    companyPublicId: preCompanyId,
    name: "",
    address: "",
    status: "ACTIVE",
  });

  function set(k: keyof AdminUpsertSitePayload, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyPublicId.trim()) { setError("기업 ID를 입력하세요."); return; }
    if (!form.name.trim()) { setError("현장명을 입력하세요."); return; }
    if (!form.address.trim()) { setError("주소를 입력하세요."); return; }
    setLoading(true); setError("");
    try {
      await createAdminSite(form);
      if (preCompanyId) router.push(`/companies/${preCompanyId}`);
      else router.push("/sites");
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "현장 관리", href: "/sites" }, { label: "현장 등록" }]}>
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">현장 등록</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <Field label="기업 PublicId *">
          <input value={form.companyPublicId} onChange={(e) => set("companyPublicId", e.target.value)} className={INPUT} placeholder="xxxxxxxx-xxxx-..." readOnly={!!preCompanyId} />
        </Field>
        <Field label="현장명 *"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={INPUT} placeholder="○○ 아파트 신축 현장" /></Field>
        <Field label="주소 *"><input value={form.address} onChange={(e) => set("address", e.target.value)} className={INPUT} placeholder="서울시 강남구..." /></Field>
        <Field label="상세주소"><input value={form.addressDetail ?? ""} onChange={(e) => set("addressDetail", e.target.value)} className={INPUT} placeholder="B동 101호" /></Field>
        <Field label="설명"><textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} className={INPUT} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="공사 시작일"><input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={INPUT} /></Field>
          <Field label="공사 종료일"><input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={INPUT} /></Field>
        </div>
        <Field label="상태">
          <select value={form.status ?? "ACTIVE"} onChange={(e) => set("status", e.target.value)} className={INPUT}>
            {["PLANNING","ACTIVE","COMPLETED","SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "등록 중…" : "현장 등록"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}
