"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminContract, AdminUpsertContractPayload } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400";
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ContractNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AdminUpsertContractPayload>({
    jobPublicId: "",
    workerPublicId: "",
    employerPublicId: "",
    payUnit: "DAILY",
  });

  function set(k: keyof AdminUpsertContractPayload, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.jobPublicId.trim() || !form.workerPublicId.trim() || !form.employerPublicId.trim()) {
      setError("공고, 근로자, 고용주 ID를 모두 입력하세요."); return;
    }
    setLoading(true); setError("");
    try {
      const { publicId } = await createAdminContract(form);
      router.push(`/contracts/${publicId}`);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "계약 관리", href: "/contracts" }, { label: "계약 생성" }]}>
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">계약 생성</h1>
        <p className="text-sm text-neutral-500 mt-1">채용공고, 근로자, 관리자를 연결하는 계약을 생성합니다.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <Field label="공고 PublicId *" hint="Jobs 메뉴에서 확인하세요">
          <input value={form.jobPublicId} onChange={(e) => set("jobPublicId", e.target.value)} className={INPUT} placeholder="xxxxxxxx-xxxx-..." />
        </Field>
        <Field label="근로자 PublicId *" hint="Workers 메뉴에서 확인하세요">
          <input value={form.workerPublicId} onChange={(e) => set("workerPublicId", e.target.value)} className={INPUT} placeholder="xxxxxxxx-xxxx-..." />
        </Field>
        <Field label="고용주 PublicId *" hint="Employers 메뉴에서 확인하세요">
          <input value={form.employerPublicId} onChange={(e) => set("employerPublicId", e.target.value)} className={INPUT} placeholder="xxxxxxxx-xxxx-..." />
        </Field>
        <Field label="지원서 ID (선택)">
          <input type="number" value={form.applicationId ?? ""} onChange={(e) => set("applicationId", Number(e.target.value) || undefined)} className={INPUT} placeholder="숫자 ID" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="계약 시작일"><input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={INPUT} /></Field>
          <Field label="계약 종료일"><input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="급여 단위">
            <select value={form.payUnit ?? "DAILY"} onChange={(e) => set("payUnit", e.target.value)} className={INPUT}>
              {["HOURLY","DAILY","WEEKLY","MONTHLY"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="급여 금액 (원)">
            <input type="number" value={form.payAmount ?? ""} onChange={(e) => set("payAmount", Number(e.target.value) || undefined)} className={INPUT} placeholder="180000" />
          </Field>
        </div>
        <Field label="계약 조건">
          <textarea value={form.terms ?? ""} onChange={(e) => set("terms", e.target.value)} rows={3} className={INPUT} placeholder="계약 세부 조건..." />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "생성 중…" : "계약 생성 (DRAFT)"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}
