"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSiteDetail, updateAdminSite } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>{children}</div>;
}

export default function SiteEditPage({ params }: { params: Promise<{ publicId: string }> }) {
  const router = useRouter();
  const [publicId, setPublicId] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ companyPublicId: "", name: "", address: "", addressDetail: "", description: "", startDate: "", endDate: "", status: "ACTIVE" });

  useEffect(() => {
    params.then(async ({ publicId: pid }) => {
      setPublicId(pid);
      try {
        const data = await getAdminSiteDetail(pid);
        setForm({ companyPublicId: "", name: data.name, address: data.address ?? "", addressDetail: "", description: "", startDate: "", endDate: "", status: data.status });
      } finally { setFetching(false); }
    });
  }, [params]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("현장명을 입력하세요."); return; }
    setLoading(true); setError("");
    try {
      await updateAdminSite(publicId, { ...form, companyPublicId: form.companyPublicId || publicId });
      router.back();
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  const breadcrumbs = [{ label: "대시보드", href: "/dashboard" }, { label: "현장 관리", href: "/sites" }, { label: "현장 수정" }];

  if (fetching) return <AdminLayout breadcrumbs={breadcrumbs}><div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">현장 수정</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <Field label="현장명 *"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={INPUT} /></Field>
        <Field label="주소 *"><input value={form.address} onChange={(e) => set("address", e.target.value)} className={INPUT} /></Field>
        <Field label="상세주소"><input value={form.addressDetail} onChange={(e) => set("addressDetail", e.target.value)} className={INPUT} /></Field>
        <Field label="설명"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={INPUT} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일"><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={INPUT} /></Field>
          <Field label="종료일"><input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={INPUT} /></Field>
        </div>
        <Field label="상태">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={INPUT}>
            {["PLANNING","ACTIVE","COMPLETED","SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}
