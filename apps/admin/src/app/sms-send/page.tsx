"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Users, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  getAdminSmsTemplates,
  adminSendSms,
  adminBroadcastSms,
  AdminSmsTemplateItem,
  PagedResponse,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────

const LOCALE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
];

const ROLE_OPTIONS = [
  { value: "", label: "전체 역할" },
  { value: "WORKER", label: "WORKER" },
  { value: "TEAM_LEADER", label: "TEAM_LEADER" },
  { value: "EMPLOYER", label: "EMPLOYER" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "PENDING", label: "PENDING" },
  { value: "SUSPENDED", label: "SUSPENDED" },
];

const VISA_OPTIONS = [
  { value: "", label: "전체 비자" },
  { value: "E9", label: "E-9" },
  { value: "H2", label: "H-2" },
  { value: "F4", label: "F-4" },
  { value: "F5", label: "F-5" },
  { value: "OTHER", label: "기타" },
];

// ─── Helpers ──────────────────────────────────────────────────

function renderPreview(
  content: string,
  variables: Record<string, string>
): string {
  if (!content) return "";
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

function charCountNote(count: number): string {
  if (count <= 90) return `${count}자 (SMS 단문: 90자 이하)`;
  return `${count}자 (SMS 장문: 90자 초과)`;
}

// ─── Tab indicator ────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: "single" | "broadcast";
  onChange: (t: "single" | "broadcast") => void;
}) {
  return (
    <div className="flex border-b border-neutral-200">
      {(
        [
          { key: "single", label: "개별 발송" },
          { key: "broadcast", label: "일괄 발송" },
        ] as const
      ).map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            active === t.key
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Variables Form ───────────────────────────────────────────

function VariablesForm({
  variables,
  values,
  onChange,
}: {
  variables: string[];
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  if (variables.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
        변수 입력
      </p>
      {variables.map((v) => (
        <div key={v}>
          <label className="text-xs font-medium text-neutral-600 mb-1 block">
            <span className="font-mono bg-indigo-50 text-indigo-700 rounded px-1 py-0.5">
              {`{{${v}}}`}
            </span>
          </label>
          <input
            type="text"
            value={values[v] ?? ""}
            onChange={(e) => onChange(v, e.target.value)}
            placeholder={`${v} 값 입력`}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Preview Box ──────────────────────────────────────────────

function PreviewBox({
  template,
  variables,
}: {
  template: AdminSmsTemplateItem | undefined;
  variables: Record<string, string>;
}) {
  const rendered = useMemo(
    () => (template ? renderPreview(template.content, variables) : ""),
    [template, variables]
  );

  return (
    <div>
      <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
        미리보기
      </p>
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-sm text-neutral-800 min-h-[80px] whitespace-pre-wrap break-words">
        {rendered || (
          <span className="text-neutral-300 not-italic">
            템플릿을 선택하면 미리보기가 표시됩니다.
          </span>
        )}
      </div>
      {rendered && (
        <p className="text-right text-xs text-neutral-400 mt-1">
          {charCountNote(rendered.length)}
        </p>
      )}
    </div>
  );
}

// ─── Single Send Tab ──────────────────────────────────────────

function SingleSendTab({
  templates,
}: {
  templates: AdminSmsTemplateItem[];
}) {
  const [toPhone, setToPhone] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [locale, setLocale] = useState("ko");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [scheduledAt, setScheduledAt] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.code === templateCode);

  function handleVarChange(key: string, val: string) {
    setVariables((prev) => ({ ...prev, [key]: val }));
  }

  function handleTemplateChange(code: string) {
    setTemplateCode(code);
    setVariables({});
  }

  const mutation = useMutation({
    mutationFn: () =>
      adminSendSms({
        toPhone,
        templateCode,
        locale,
        variables: Object.keys(variables).length ? variables : undefined,
        scheduledAt: scheduledAt || undefined,
      }),
    onSuccess: (data) => {
      setSuccess(`발송 완료! 로그 ID: ${data.publicId}`);
      setError(null);
      setToPhone("");
      setTemplateCode("");
      setLocale("ko");
      setVariables({});
      setScheduledAt("");
    },
    onError: (err) => {
      setError((err as Error).message);
      setSuccess(null);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toPhone.trim()) {
      setError("수신 번호를 입력해주세요.");
      return;
    }
    if (!templateCode) {
      setError("템플릿을 선택해주세요.");
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Recipient */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-5 space-y-5">
          <h3 className="text-sm font-bold text-neutral-800">수신자</h3>

          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={toPhone}
              onChange={(e) => setToPhone(e.target.value)}
              placeholder="+821012345678 또는 01012345678"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <p className="text-xs text-neutral-400 mt-1">
              국제 형식(+82) 또는 국내 형식 모두 입력 가능합니다.
            </p>
          </div>
        </div>

        {/* Right: Message */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-5 space-y-5">
          <h3 className="text-sm font-bold text-neutral-800">메시지</h3>

          {/* Template select */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              템플릿 <span className="text-red-500">*</span>
            </label>
            <select
              value={templateCode}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">— 템플릿 선택 —</option>
              {templates.map((t) => (
                <option key={t.publicId} value={t.code}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Locale */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">언어</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              {LOCALE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Variables */}
          {selectedTemplate && (
            <VariablesForm
              variables={selectedTemplate.variables}
              values={variables}
              onChange={handleVarChange}
            />
          )}

          {/* Live preview */}
          <PreviewBox template={selectedTemplate} variables={variables} />

          {/* Scheduled send */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              예약 발송{" "}
              <span className="font-normal text-neutral-400">(비워두면 즉시 발송)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Send className="h-4 w-4" />
          {mutation.isPending ? "발송 중..." : "발송하기"}
        </button>
      </div>
    </form>
  );
}

// ─── Broadcast Tab ────────────────────────────────────────────

function BroadcastTab({ templates }: { templates: AdminSmsTemplateItem[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 filter state
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVisaType, setFilterVisaType] = useState("");

  // Step 2 message state
  const [templateCode, setTemplateCode] = useState("");
  const [locale, setLocale] = useState("ko");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [scheduledAt, setScheduledAt] = useState("");

  // Result
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.code === templateCode);

  function handleVarChange(key: string, val: string) {
    setVariables((prev) => ({ ...prev, [key]: val }));
  }

  function handleTemplateChange(code: string) {
    setTemplateCode(code);
    setVariables({});
  }

  const mutation = useMutation({
    mutationFn: () =>
      adminBroadcastSms({
        templateCode,
        locale,
        variables: Object.keys(variables).length ? variables : undefined,
        filterRole: filterRole || undefined,
        filterStatus: filterStatus || undefined,
        filterVisaType: filterVisaType || undefined,
        scheduledAt: scheduledAt || undefined,
      }),
    onSuccess: (data) => {
      setSuccess(`${data.count.toLocaleString("ko-KR")}명에게 발송 완료`);
      setError(null);
      setStep(1);
      setFilterRole("");
      setFilterStatus("");
      setFilterVisaType("");
      setTemplateCode("");
      setLocale("ko");
      setVariables({});
      setScheduledAt("");
    },
    onError: (err) => {
      setError((err as Error).message);
      setSuccess(null);
    },
  });

  // Step breadcrumb
  const STEPS = [
    { n: 1, label: "수신자 필터" },
    { n: 2, label: "메시지" },
    { n: 3, label: "확인 및 발송" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2 items-center mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s.n
                  ? "bg-brand-blue text-white"
                  : step > s.n
                  ? "bg-brand-blue/20 text-brand-blue"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {s.n}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                step === s.n ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-neutral-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6 space-y-5">
          <h3 className="text-sm font-bold text-neutral-800">수신자 필터</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">역할</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">상태</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">비자 유형</label>
              <select
                value={filterVisaType}
                onChange={(e) => setFilterVisaType(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {VISA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-200 px-4 py-3">
            <Users className="h-4 w-4 text-neutral-400" />
            <p className="text-sm text-neutral-600">
              예상 수신자:{" "}
              <span className="font-semibold text-neutral-900">
                {!filterRole && !filterStatus && !filterVisaType
                  ? "전체 회원"
                  : "필터 적용"}
              </span>{" "}
              <span className="text-neutral-400 text-xs">
                (정확한 수는 발송 시 결정됩니다)
              </span>
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6 space-y-5">
          <h3 className="text-sm font-bold text-neutral-800">메시지 작성</h3>

          {/* Template select */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              템플릿 <span className="text-red-500">*</span>
            </label>
            <select
              value={templateCode}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">— 템플릿 선택 —</option>
              {templates.map((t) => (
                <option key={t.publicId} value={t.code}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Locale */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">언어</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              {LOCALE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Variables */}
          {selectedTemplate && (
            <VariablesForm
              variables={selectedTemplate.variables}
              values={variables}
              onChange={handleVarChange}
            />
          )}

          {/* Live preview */}
          <PreviewBox template={selectedTemplate} variables={variables} />

          {/* Scheduled send */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
              예약 발송{" "}
              <span className="font-normal text-neutral-400">(비워두면 즉시 발송)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => {
                if (!templateCode) {
                  setError("템플릿을 선택해주세요.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6 space-y-5">
          <h3 className="text-sm font-bold text-neutral-800">확인 및 발송</h3>

          {/* Summary card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">템플릿 코드</span>
              <span className="font-mono font-semibold text-neutral-800">{templateCode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">언어</span>
              <span className="font-medium text-neutral-800">
                {LOCALE_OPTIONS.find((l) => l.value === locale)?.label ?? locale}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">역할 필터</span>
              <span className="font-medium text-neutral-800">
                {ROLE_OPTIONS.find((o) => o.value === filterRole)?.label ?? "전체"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">상태 필터</span>
              <span className="font-medium text-neutral-800">
                {STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label ?? "전체"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">비자 필터</span>
              <span className="font-medium text-neutral-800">
                {VISA_OPTIONS.find((o) => o.value === filterVisaType)?.label ?? "전체"}
              </span>
            </div>
            {scheduledAt && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">예약 시각</span>
                <span className="font-medium text-neutral-800">
                  {new Date(scheduledAt).toLocaleString("ko-KR")}
                </span>
              </div>
            )}
          </div>

          {/* Preview */}
          <PreviewBox template={selectedTemplate} variables={variables} />

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              일괄 발송은 최대 500명까지 가능합니다. 발송 후에는 취소가 불가능합니다.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? "발송 중..." : "발송 확인"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function SmsSendPage() {
  const [activeTab, setActiveTab] = useState<"single" | "broadcast">("single");

  const { data: templatesData } = useQuery<PagedResponse<AdminSmsTemplateItem>>({
    queryKey: ["admin", "sms-templates-all"],
    queryFn: () => getAdminSmsTemplates({ page: 0, size: 100, isActive: true }),
  });

  const templates = templatesData?.content ?? [];

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "발송 도구" },
      ]}
    >
      <div className="space-y-6 max-w-5xl">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">발송 도구</h1>
          <p className="mt-1 text-sm text-neutral-500">
            개별 또는 일괄로 SMS를 발송합니다.
          </p>
        </div>

        {/* Card with tabs */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <TabBar active={activeTab} onChange={setActiveTab} />
          <div className="p-5 sm:p-6">
            {activeTab === "single" ? (
              <SingleSendTab templates={templates} />
            ) : (
              <BroadcastTab templates={templates} />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
