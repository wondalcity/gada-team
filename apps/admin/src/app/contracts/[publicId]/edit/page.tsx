"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminContractDetail, updateAdminContract } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>{children}</div>;
}

export default function ContractEditPage({ params }: { params: Promise<{ publicId: string }> }) {
  const router = useRouter();
  const [publicId, setPublicId] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    payAmount: "" as string | number,
    payUnit: "DAILY",
    terms: "",
    documentUrl: "",
  });

  useEffect(() => {
    params.then(async ({ publicId: pid }) => {
      setPublicId(pid);
      try {
        const data = await getAdminContractDetail(pid);
        setForm({
          startDate: data.startDate ?? "",
          endDate: data.endDate ?? "",
          payAmount: data.payAmount ?? "",
          payUnit: data.payUnit ?? "DAILY",
          terms: data.terms ?? "",
          documentUrl: data.documentUrl ?? "",
        });
      } finally { setFetching(false); }
    });
  }, [params]);

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await updateAdminContract(publicId, {
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        payAmount: form.payAmount ? Number(form.payAmount) : undefined,
        payUnit: form.payUnit || undefined,
        terms: form.terms || undefined,
        documentUrl: form.documentUrl || undefined,
        jobPublicId: "",
        workerPublicId: "",
        employerPublicId: "",
      });
      router.push(`/contracts/${publicId}`);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  const breadcrumbs = [{ label: "대시보드", href: "/dashboard" }, { label: "계약 관리", href: "/contracts" }, { label: "계약 수정" }];

  if (fetching) return <AdminLayout breadcrumbs={breadcrumbs}><div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">계약 수정</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일"><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={INPUT} /></Field>
          <Field label="종료일"><input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="급여 단위">
            <select value={form.payUnit} onChange={(e) => set("payUnit", e.target.value)} className={INPUT}>
              {["HOURLY","DAILY","WEEKLY","MONTHLY"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="급여 금액"><input type="number" value={form.payAmount} onChange={(e) => set("payAmount", e.target.value)} className={INPUT} /></Field>
        </div>
        <Field label="계약 조건"><textarea value={form.terms} onChange={(e) => set("terms", e.target.value)} rows={4} className={INPUT} /></Field>
        <Field label="계약서 URL"><input value={form.documentUrl} onChange={(e) => set("documentUrl", e.target.value)} className={INPUT} placeholder="https://..." /></Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}
