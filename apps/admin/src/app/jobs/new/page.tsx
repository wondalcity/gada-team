"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createAdminJob, AdminUpsertJobPayload } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400";
const VISA_TYPES = ["E9","H2","E7","F4","F5","F6","CITIZEN"];
const APP_TYPES = ["INDIVIDUAL","TEAM","COMPANY"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-neutral-500 mb-1">{label}</label>{children}</div>;
}

function ToggleGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button"
          onClick={() => onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o])}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selected.includes(o) ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function JobNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSiteId = searchParams.get("sitePublicId") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AdminUpsertJobPayload>({
    sitePublicId: preSiteId,
    title: "",
    applicationTypes: ["INDIVIDUAL","TEAM","COMPANY"],
    payUnit: "DAILY",
    visaRequirements: [],
    certificationRequirements: [],
    healthCheckRequired: false,
    alwaysOpen: false,
    accommodationProvided: false,
    mealProvided: false,
    transportationProvided: false,
    publish: false,
  });

  function set(k: keyof AdminUpsertJobPayload, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sitePublicId.trim()) { setError("현장 PublicId를 입력하세요."); return; }
    if (!form.title.trim()) { setError("공고 제목을 입력하세요."); return; }
    setLoading(true); setError("");
    try {
      const { publicId } = await createAdminJob(form);
      router.push(`/jobs/${publicId}`);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "채용공고", href: "/jobs" }, { label: "공고 등록" }]}>
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">채용공고 등록</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
        <Field label="현장 PublicId *">
          <input value={form.sitePublicId} onChange={(e) => set("sitePublicId", e.target.value)} className={INPUT} placeholder="xxxxxxxx-xxxx-..." readOnly={!!preSiteId} />
        </Field>
        <Field label="공고 제목 *"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={INPUT} placeholder="콘크리트 전문 인력 모집" /></Field>
        <Field label="공고 설명">
          <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={4} className={INPUT} placeholder="상세 업무 내용..." />
        </Field>
        <Field label="모집 인원"><input type="number" value={form.requiredCount ?? ""} onChange={(e) => set("requiredCount", Number(e.target.value))} className={INPUT} placeholder="5" /></Field>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">지원 방식</label>
          <ToggleGroup options={APP_TYPES} selected={form.applicationTypes ?? []} onChange={(v) => set("applicationTypes", v)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="급여 단위">
            <select value={form.payUnit ?? "DAILY"} onChange={(e) => set("payUnit", e.target.value)} className={INPUT}>
              {["HOURLY","DAILY","WEEKLY","MONTHLY","LUMP_SUM"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="최소 급여"><input type="number" value={form.payMin ?? ""} onChange={(e) => set("payMin", Number(e.target.value) || undefined)} className={INPUT} placeholder="160000" /></Field>
          <Field label="최대 급여"><input type="number" value={form.payMax ?? ""} onChange={(e) => set("payMax", Number(e.target.value) || undefined)} className={INPUT} placeholder="200000" /></Field>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">비자 요건</label>
          <ToggleGroup options={VISA_TYPES} selected={form.visaRequirements ?? []} onChange={(v) => set("visaRequirements", v)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="공사 시작일"><input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={INPUT} /></Field>
          <Field label="공사 종료일"><input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={INPUT} /></Field>
        </div>

        <div className="flex flex-wrap gap-4">
          {([["healthCheckRequired","건강검진 필수"],["alwaysOpen","상시 모집"],["accommodationProvided","숙소 제공"],["mealProvided","식사 제공"],["transportationProvided","교통 제공"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={!!(form as any)[k]} onChange={(e) => set(k, e.target.checked)} className="rounded" />
              {label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800 cursor-pointer">
          <input type="checkbox" checked={!!form.publish} onChange={(e) => set("publish", e.target.checked)} className="rounded" />
          즉시 게시 (미체크 시 임시저장)
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "등록 중…" : "공고 등록"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}

export default function JobNewPage() {
  return (
    <Suspense>
      <JobNewContent />
    </Suspense>
  );
}
