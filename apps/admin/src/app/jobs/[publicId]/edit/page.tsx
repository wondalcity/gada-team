"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminJobDetail, updateAdminJob, AdminUpsertJobPayload } from "@/lib/api";
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

export default function JobEditPage({ params }: { params: Promise<{ publicId: string }> }) {
  const router = useRouter();
  const [publicId, setPublicId] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sitePublicId, setSitePublicId] = useState("");
  const [form, setForm] = useState<Omit<AdminUpsertJobPayload, "sitePublicId">>({
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
  });

  useEffect(() => {
    params.then(async ({ publicId: pid }) => {
      setPublicId(pid);
      try {
        const data = await getAdminJobDetail(pid);
        setSitePublicId(data.sitePublicId);
        setForm({
          title: data.title,
          description: (data as any).description,
          requiredCount: (data as any).requiredCount,
          applicationTypes: (data as any).applicationTypes ?? ["INDIVIDUAL","TEAM","COMPANY"],
          payMin: data.payMin,
          payMax: data.payMax,
          payUnit: data.payUnit,
          visaRequirements: (data as any).visaRequirements ?? [],
          certificationRequirements: (data as any).certificationRequirements ?? [],
          healthCheckRequired: (data as any).healthCheckRequired ?? false,
          alwaysOpen: (data as any).alwaysOpen ?? false,
          startDate: (data as any).startDate,
          endDate: (data as any).endDate,
          accommodationProvided: data.accommodationProvided,
          mealProvided: data.mealProvided,
          transportationProvided: data.transportationProvided,
        });
      } finally { setFetching(false); }
    });
  }, [params]);

  function set(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("공고 제목을 입력하세요."); return; }
    setLoading(true); setError("");
    try {
      await updateAdminJob(publicId, { ...form, sitePublicId });
      router.push(`/jobs/${publicId}`);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  const breadcrumbs = [{ label: "대시보드", href: "/dashboard" }, { label: "채용공고", href: "/jobs" }, { label: "공고 수정" }];

  if (fetching) return <AdminLayout breadcrumbs={breadcrumbs}><div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-800 mb-2">← 돌아가기</button>
        <h1 className="text-xl font-bold text-neutral-900">채용공고 수정</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
        <Field label="공고 제목 *"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={INPUT} /></Field>
        <Field label="공고 설명"><textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={4} className={INPUT} /></Field>
        <Field label="모집 인원"><input type="number" value={form.requiredCount ?? ""} onChange={(e) => set("requiredCount", Number(e.target.value))} className={INPUT} /></Field>
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
          <Field label="최소 급여"><input type="number" value={form.payMin ?? ""} onChange={(e) => set("payMin", Number(e.target.value) || undefined)} className={INPUT} /></Field>
          <Field label="최대 급여"><input type="number" value={form.payMax ?? ""} onChange={(e) => set("payMax", Number(e.target.value) || undefined)} className={INPUT} /></Field>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">비자 요건</label>
          <ToggleGroup options={VISA_TYPES} selected={form.visaRequirements ?? []} onChange={(v) => set("visaRequirements", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일"><input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={INPUT} /></Field>
          <Field label="종료일"><input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={INPUT} /></Field>
        </div>
        <div className="flex flex-wrap gap-4">
          {([["healthCheckRequired","건강검진 필수"],["alwaysOpen","상시 모집"],["accommodationProvided","숙소 제공"],["mealProvided","식사 제공"],["transportationProvided","교통 제공"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={!!(form as any)[k]} onChange={(e) => set(k, e.target.checked)} className="rounded" />
              {label}
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-900 font-bold text-sm hover:bg-amber-500 disabled:opacity-50">
          {loading ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}
