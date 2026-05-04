"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogOut, HardHat, Building2, Users, ShieldCheck,
  Phone, Globe, Award, Briefcase, User,
  ChevronRight, FileText, Bell, Pencil, Heart,
  CheckCircle2, Clock, Image as ImageIcon, Camera,
  X, Plus, Trash2, ChevronDown, Coins, Receipt, ArrowLeftRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { getMyWorkerProfile, updateMyWorkerProfile, WorkerProfile } from "@/lib/api";
import { teamsApi, TeamResponse } from "@/lib/teams-api";
import { uploadImageToStorage } from "@/lib/firebase";
import { equipmentLabel } from "@/lib/equipment-labels";
import { useT } from "@/lib/i18n";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DateInput } from "@/components/ui/DateInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const NATIONALITY_FLAGS: Record<string, string> = {
  KR: "🇰🇷", VN: "🇻🇳", CN: "🇨🇳", PH: "🇵🇭", ID: "🇮🇩", OTHER: "🌐",
};
const NATIONALITY_LABELS: Record<string, string> = {
  KR: "한국", VN: "베트남", CN: "중국", PH: "필리핀", ID: "인도네시아", OTHER: "기타",
};
const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어", vi: "베트남어", en: "영어", zh: "중국어",
};
const LEVEL_LABELS: Record<string, string> = {
  NATIVE: "원어민", FLUENT: "유창", INTERMEDIATE: "중급", BASIC: "기초",
};
const HEALTH_LABELS: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "완료", color: "text-success-700 bg-success-50 border-success-200" },
  NOT_DONE:  { label: "미완료", color: "text-neutral-500 bg-neutral-50 border-neutral-100" },
  EXPIRED:   { label: "만료", color: "text-danger-700 bg-danger-50 border-danger-200" },
};
const PAY_UNIT_LABELS: Record<string, string> = {
  HOURLY: "시급", DAILY: "일급", WEEKLY: "주급", MONTHLY: "월급",
};

const NATIONALITY_OPTIONS = [
  { value: "VN", label: "베트남", icon: "🇻🇳" },
  { value: "KR", label: "한국",   icon: "🇰🇷" },
  { value: "CN", label: "중국",   icon: "🇨🇳" },
  { value: "PH", label: "필리핀", icon: "🇵🇭" },
  { value: "ID", label: "인도네시아", icon: "🇮🇩" },
  { value: "OTHER", label: "기타", icon: "🌐" },
];

const VISA_OPTIONS = [
  { value: "CITIZEN", label: "내국인" },
  { value: "E-9",     label: "E-9 비전문취업" },
  { value: "E-7",     label: "E-7 특정활동" },
  { value: "H-2",     label: "H-2 방문취업" },
  { value: "F-4",     label: "F-4 재외동포" },
  { value: "F-5",     label: "F-5 영주" },
  { value: "F-6",     label: "F-6 결혼이민" },
  { value: "D-10",    label: "D-10 구직" },
  { value: "기타",    label: "기타" },
];
const LANGUAGE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "vi", label: "베트남어" },
  { value: "en", label: "영어" },
  { value: "zh", label: "중국어" },
];
const LEVEL_OPTIONS = [
  { value: "NATIVE", label: "원어민" },
  { value: "FLUENT", label: "유창" },
  { value: "INTERMEDIATE", label: "중급" },
  { value: "BASIC", label: "기초" },
];
const PAY_UNIT_OPTIONS = [
  { value: "HOURLY", label: "시급" },
  { value: "DAILY", label: "일급" },
  { value: "WEEKLY", label: "주급" },
  { value: "MONTHLY", label: "월급" },
];

const CONSTRUCTION_CERTS = [
  "굴삭기운전기능사", "지게차운전기능사", "기중기운전기능사", "크레인운전기능사",
  "건설기계정비기능사", "건설기계정비기사", "건설기계기술사",
  "철근기능사", "비계기능사", "콘크리트기능사", "콘크리트기사",
  "용접기능사", "특수용접기능사",
  "도장기능사", "미장기능사", "타일기능사", "방수기능사",
  "배관기능사", "수도배관기능사", "조적기능사", "석공기능사",
  "도배기능사", "판금제관기능사",
  "건축기사", "건축산업기사", "건축시공기술사",
  "토목기사", "토목산업기사", "토목시공기술사",
  "건설안전기사", "건설안전기술사", "산업안전기사", "산업안전산업기사",
  "전기기능사", "전기기사", "전기산업기사",
  "건설재료시험기사", "건설재료시험기능사",
  "측량기능사", "일반기계기사",
];

// ─── Certification search combobox ────────────────────────────────────────────

function CertSearchInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim() === ""
    ? CONSTRUCTION_CERTS.slice(0, 12)
    : CONSTRUCTION_CERTS.filter((c) => c.includes(value.trim())).slice(0, 12);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {filtered.map((cert) => (
              <button
                key={cert}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(cert); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-sm text-neutral-800 hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-neutral-50 last:border-0"
              >
                {cert}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, action }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-neutral-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Worker profile sections ──────────────────────────────────────────────────

function WorkerProfileContent({ profile }: { profile: WorkerProfile }) {
  const t = useT();
  const health = profile.healthCheckStatus
    ? {
        label: profile.healthCheckStatus === "COMPLETED"
          ? t("profile.health.done")
          : profile.healthCheckStatus === "NOT_DONE"
            ? t("profile.health.notDone")
            : t("profile.health.expired"),
        color: HEALTH_LABELS[profile.healthCheckStatus]?.color ?? "",
      }
    : null;
  const payLabel = profile.desiredPayMin
    ? `${profile.desiredPayMin.toLocaleString()}~${(profile.desiredPayMax ?? 0).toLocaleString()}${t("filter.currencyUnit")} / ${PAY_UNIT_LABELS[profile.desiredPayUnit ?? ""] ?? profile.desiredPayUnit}`
    : null;

  return (
    <>
      {/* Basic info */}
      <SectionCard title={t("worker.basicInfo")} icon={User}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <p className="text-xs text-neutral-400 mb-1">{t("worker.nationality")}</p>
            <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
              {profile.nationality && NATIONALITY_FLAGS[profile.nationality] && (
                <span className="text-base leading-none">{NATIONALITY_FLAGS[profile.nationality]}</span>
              )}
              {NATIONALITY_LABELS[profile.nationality ?? ""] ?? profile.nationality ?? t("profile.notEntered")}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">{t("worker.visa")}</p>
            <p className="text-sm font-medium text-neutral-900">{profile.visaType ?? t("profile.notEntered")}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">{t("profile.birthDate")}</p>
            <p className="text-sm font-medium text-neutral-900">{profile.birthDate ?? t("profile.notEntered")}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">{t("worker.health")}</p>
            {health ? (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${health.color}`}>
                {profile.healthCheckStatus === "COMPLETED" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {health.label}
              </span>
            ) : (
              <p className="text-sm text-neutral-400">{t("profile.notEntered")}</p>
            )}
          </div>
          {payLabel && (
            <div className="col-span-2">
              <p className="text-xs text-neutral-400 mb-1">{t("worker.desiredPay")}</p>
              <p className="text-sm font-medium text-neutral-900">{payLabel}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Languages */}
      {profile.languages && profile.languages.length > 0 && (
        <SectionCard title={t("worker.languages")} icon={Globe}>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((lang, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 border border-primary-200 px-3 py-1.5 text-sm text-primary-700">
                <span className="font-medium">{LANGUAGE_LABELS[lang.code] ?? lang.code}</span>
                <span className="text-blue-300">·</span>
                <span className="text-xs text-primary-500">{LEVEL_LABELS[lang.level] ?? lang.level}</span>
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Certifications */}
      {profile.certifications && profile.certifications.length > 0 && (
        <SectionCard title={t("worker.certifications")} icon={Award}>
          <div className="space-y-2">
            {profile.certifications.map((cert, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-800">{cert.name}</span>
                </div>
                {cert.issueDate && (
                  <span className="text-xs text-neutral-400">{cert.issueDate}</span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Equipment */}
      {profile.equipment && profile.equipment.length > 0 && (
        <SectionCard title={t("worker.equipment")} icon={Briefcase}>
          <div className="flex flex-wrap gap-2">
            {profile.equipment.map((eq, i) => (
              <span key={i} className="inline-flex items-center rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700">
                {equipmentLabel(eq)}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Portfolio */}
      {profile.portfolio && profile.portfolio.length > 0 && (
        <SectionCard title={t("worker.portfolio")} icon={ImageIcon}>
          <div className="space-y-4">
            {profile.portfolio.map((item, i) => (
              <div key={i} className="border border-neutral-100 rounded-lg overflow-hidden">
                {item.imageUrls?.[0] && (
                  <div className="h-36 bg-neutral-100 overflow-hidden">
                    <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                  {(item.startDate || item.endDate) && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {item.startDate ?? ""} {item.startDate && item.endDate ? "~" : ""} {item.endDate ?? ""}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

// ─── Team membership section ──────────────────────────────────────────────────

function TeamSection({ profile }: { profile: WorkerProfile }) {
  const t = useT();
  const { data: team, isLoading } = useQuery<TeamResponse>({
    queryKey: ["my-team"],
    queryFn: () => teamsApi.getMyTeam(),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-100 shadow-sm p-5 animate-pulse">
        <div className="h-4 w-24 bg-neutral-100 rounded mb-3" />
        <div className="h-16 bg-neutral-50 rounded-lg" />
      </div>
    );
  }

  if (!team) {
    return (
      <SectionCard title={profile.role === "TEAM_LEADER" ? t("profile.myTeam") : t("worker.team")} icon={Users}>
        <div className="text-center py-4">
          <p className="text-sm text-neutral-500 mb-3">
            {profile.role === "TEAM_LEADER"
              ? t("profile.noTeamLeader")
              : t("profile.noTeamMember")}
          </p>
          {profile.role === "TEAM_LEADER" ? (
            <Link
              href="/teams/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              + {t("profile.createTeam")}
            </Link>
          ) : (
            <Link
              href="/teams"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              {t("profile.findTeam")}
            </Link>
          )}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={profile.role === "TEAM_LEADER" ? t("profile.myTeamLeader") : t("worker.team")}
      icon={Users}
      action={
        <Link href={`/teams/${team.publicId}`} className="text-xs text-primary-500 font-medium hover:underline">
          {t("profile.teamPage")}
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        {team.coverImageUrl ? (
          <img src={team.coverImageUrl} alt={team.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-secondary-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-secondary-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 truncate">{team.name}</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t("profile.memberCount", team.memberCount)} · {team.isNationwide ? t("profile.nationwide") : t("profile.regional")} 활동
          </p>
          {team.introShort && (
            <p className="text-xs text-neutral-400 mt-1 truncate">{team.introShort}</p>
          )}
        </div>
      </div>

      {/* Members preview */}
      {team.members && team.members.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-50">
          <p className="text-xs text-neutral-400 mb-2">{t("worker.memberBadge")}</p>
          <div className="flex flex-wrap gap-2">
            {team.members.slice(0, 5).map((m) => (
              <div key={m.userId} className="flex items-center gap-1.5 rounded-full bg-neutral-50 border border-neutral-100 px-2.5 py-1">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.role === "LEADER" ? "bg-primary-500 text-white" : "bg-neutral-200 text-neutral-600"}`}>
                  {m.fullName?.[0] ?? "?"}
                </div>
                <span className="text-xs text-neutral-700 font-medium">
                  {m.fullName ?? t("profile.notRegistered")}
                </span>
                {m.role === "LEADER" && (
                  <span className="text-[10px] text-primary-500 font-semibold">{t("worker.leaderBadge")}</span>
                )}
              </div>
            ))}
            {team.members.length > 5 && (
              <span className="text-xs text-neutral-400 self-center">+{team.members.length - 5}{t("common.persons")}</span>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-lg border border-neutral-100 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-lg bg-neutral-200" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-neutral-200 rounded" />
            <div className="h-5 w-32 bg-neutral-200 rounded" />
            <div className="h-3 w-24 bg-neutral-100 rounded" />
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-neutral-100 p-5 space-y-3">
          <div className="h-4 w-24 bg-neutral-200 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-neutral-100 rounded-lg" />
            <div className="h-10 bg-neutral-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Date format helper ───────────────────────────────────────────────────────
// Normalise "2024.12.31" or "2024/12/31" → "2024-12-31" for <input type="date">
function toDateInput(v: string): string {
  if (!v) return "";
  return v.replace(/[./]/g, "-");
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

interface EditValues {
  fullName: string;
  nationality: string;
  visaType: string;
  desiredPayMin: string;
  desiredPayMax: string;
  desiredPayUnit: string;
  languages: { code: string; level: string }[];
  certifications: { name: string; issueDate: string }[];
  equipment: string[];
  newEquipment: string;
}

function initEditValues(profile: WorkerProfile): EditValues {
  return {
    fullName: profile.fullName ?? "",
    nationality: profile.nationality ?? "",
    visaType: profile.visaType ?? "",
    desiredPayMin: profile.desiredPayMin ? String(profile.desiredPayMin) : "",
    desiredPayMax: profile.desiredPayMax ? String(profile.desiredPayMax) : "",
    desiredPayUnit: profile.desiredPayUnit ?? "DAILY",
    languages: profile.languages?.length ? [...profile.languages] : [{ code: "vi", level: "BASIC" }],
    certifications: profile.certifications?.length
      ? profile.certifications.map((c) => ({ name: c.name, issueDate: c.issueDate ?? "" }))
      : [],
    equipment: profile.equipment?.length ? [...profile.equipment] : [],
    newEquipment: "",
  };
}

function EditDrawer({
  profile,
  onClose,
  onSave,
  isSaving,
}: {
  profile: WorkerProfile;
  onClose: () => void;
  onSave: (values: Omit<EditValues, "newEquipment">) => void;
  isSaving: boolean;
}) {
  const t = useT();
  const [vals, setVals] = useState<EditValues>(() => initEditValues(profile));
  // Track Korean IME composition to prevent partial character from being added as a tag
  const isComposingRef = useRef(false);

  function setField<K extends keyof EditValues>(key: K, value: EditValues[K]) {
    setVals((prev) => ({ ...prev, [key]: value }));
  }

  function addLanguage() {
    setVals((prev) => ({
      ...prev,
      languages: [...prev.languages, { code: "en", level: "BASIC" }],
    }));
  }

  function removeLanguage(i: number) {
    setVals((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, idx) => idx !== i),
    }));
  }

  function updateLanguage(i: number, key: "code" | "level", value: string) {
    setVals((prev) => ({
      ...prev,
      languages: prev.languages.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)),
    }));
  }

  function addCert() {
    setVals((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: "", issueDate: "" }],
    }));
  }

  function removeCert(i: number) {
    setVals((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, idx) => idx !== i),
    }));
  }

  function updateCert(i: number, key: "name" | "issueDate", value: string) {
    setVals((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)),
    }));
  }

  function addEquipment() {
    const trimmed = vals.newEquipment.trim();
    if (!trimmed) return;
    setVals((prev) => ({
      ...prev,
      equipment: [...prev.equipment, trimmed],
      newEquipment: "",
    }));
  }

  function removeEquipment(i: number) {
    setVals((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((_, idx) => idx !== i),
    }));
  }

  function handleSubmit() {
    const { newEquipment, ...rest } = vals;
    onSave(rest);
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";
  const selectClass =
    "w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none";
  const labelClass = "block text-xs font-medium text-neutral-500 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet — bottom sheet on mobile, centred modal on md+ */}
      <div className="relative bg-neutral-50 rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col w-full md:max-w-lg max-h-[92vh] md:max-h-[85vh]">
        {/* Handle + Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 bg-white rounded-t-3xl md:rounded-t-2xl border-b border-neutral-100 flex-shrink-0">
          <h2 className="text-base font-bold text-neutral-900">{t("profile.editTitle")}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          {/* Full name */}
          <div>
            <label className={labelClass}>{t("profile.editName")}</label>
            <input
              type="text"
              value={vals.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder={t("profile.editNamePlaceholder")}
              className={inputClass}
            />
          </div>

          {/* Nationality + Visa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("worker.nationality")}</label>
              <CustomSelect
                options={NATIONALITY_OPTIONS}
                value={vals.nationality}
                onChange={(v) => setField("nationality", v)}
                placeholder={t("profile.editSelect")}
              />
            </div>
            <div>
              <label className={labelClass}>{t("profile.editVisa")}</label>
              <CustomSelect
                options={VISA_OPTIONS}
                value={vals.visaType}
                onChange={(v) => setField("visaType", v)}
                placeholder={t("profile.editSelect")}
              />
            </div>
          </div>

          {/* Desired pay */}
          <div>
            <label className={labelClass}>{t("worker.desiredPay")}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={vals.desiredPayMin ? Number(vals.desiredPayMin).toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "")
                  setField("desiredPayMin", raw)
                }}
                placeholder={t("profile.payMin")}
                className={`${inputClass} flex-1`}
              />
              <span className="text-neutral-400 text-sm flex-shrink-0">~</span>
              <input
                type="text"
                inputMode="numeric"
                value={vals.desiredPayMax ? Number(vals.desiredPayMax).toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "")
                  setField("desiredPayMax", raw)
                }}
                placeholder={t("profile.payMax")}
                className={`${inputClass} flex-1`}
              />
              <div className="relative flex-shrink-0 w-24">
                <select
                  value={vals.desiredPayUnit}
                  onChange={(e) => setField("desiredPayUnit", e.target.value)}
                  className={selectClass}
                >
                  {PAY_UNIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Languages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} mb-0`}>{t("worker.languages")}</label>
              <button
                type="button"
                onClick={addLanguage}
                className="flex items-center gap-1 text-xs text-primary-500 font-medium hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("profile.editAdd")}
              </button>
            </div>
            <div className="space-y-2">
              {vals.languages.map((lang, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={lang.code}
                      onChange={(e) => updateLanguage(i, "code", e.target.value)}
                      className={selectClass}
                    >
                      {LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={lang.level}
                      onChange={(e) => updateLanguage(i, "level", e.target.value)}
                      className={selectClass}
                    >
                      {LEVEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLanguage(i)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:text-danger-500 hover:border-danger-200 flex-shrink-0 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {vals.languages.length === 0 && (
                <p className="text-xs text-neutral-400 py-2 text-center">{t("profile.editAddLang")}</p>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} mb-0`}>{t("worker.certifications")}</label>
              <button
                type="button"
                onClick={addCert}
                className="flex items-center gap-1 text-xs text-primary-500 font-medium hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("profile.editAdd")}
              </button>
            </div>
            <div className="space-y-3">
              {vals.certifications.map((cert, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CertSearchInput
                      value={cert.name}
                      onChange={(v) => updateCert(i, "name", v)}
                      placeholder={t("profile.editCertName")}
                    />
                    <button
                      type="button"
                      onClick={() => removeCert(i)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:text-danger-500 hover:border-danger-200 flex-shrink-0 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="w-48">
                    <DateInput
                      value={toDateInput(cert.issueDate)}
                      onChange={(v) => updateCert(i, "issueDate", v)}
                      placeholder="취득일 선택"
                    />
                  </div>
                </div>
              ))}
              {vals.certifications.length === 0 && (
                <p className="text-xs text-neutral-400 py-2 text-center">{t("profile.editAddCert")}</p>
              )}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className={labelClass}>{t("worker.equipment")}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {vals.equipment.map((eq, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700"
                >
                  {eq}
                  <button
                    type="button"
                    onClick={() => removeEquipment(i)}
                    className="ml-0.5 text-neutral-400 hover:text-danger-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={vals.newEquipment}
                onChange={(e) => setField("newEquipment", e.target.value)}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposingRef.current) {
                    e.preventDefault();
                    addEquipment();
                  }
                }}
                placeholder={t("profile.editEquipmentAdd")}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={addEquipment}
                className="px-4 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
              >
                {t("profile.editAdd")}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 bg-white border-t border-neutral-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const activeMode = useAuthStore((s) => s.activeMode);
  const setActiveMode = useAuthStore((s) => s.setActiveMode);
  const queryClient = useQueryClient();
  const t = useT();

  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isWorkerRole = user?.role === "WORKER" || user?.role === "TEAM_LEADER";

  const { data: profile, isLoading: profileLoading } = useQuery<WorkerProfile>({
    queryKey: ["my-worker-profile"],
    queryFn: getMyWorkerProfile,
    enabled: !!user && isWorkerRole,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateMyWorkerProfile>[0]) =>
      updateMyWorkerProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-worker-profile"] });
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `profiles/workers/${user!.userId}_${Date.now()}.${ext}`;
      const url = await uploadImageToStorage(file, path);
      await updateMyWorkerProfile({ profileImageUrl: url });
      queryClient.invalidateQueries({ queryKey: ["my-worker-profile"] });
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSaveProfile(values: Omit<EditValues, "newEquipment">) {
    updateMutation.mutate({
      fullName: values.fullName || undefined,
      nationality: values.nationality || undefined,
      visaType: values.visaType || undefined,
      desiredPayMin: values.desiredPayMin ? Number(values.desiredPayMin) : undefined,
      desiredPayMax: values.desiredPayMax ? Number(values.desiredPayMax) : undefined,
      desiredPayUnit: values.desiredPayUnit || undefined,
      languages: values.languages,
      certifications: values.certifications
        .filter((c) => c.name.trim())
        .map((c) => ({ code: c.name.toLowerCase().replace(/\s+/g, "_"), name: c.name, issueDate: c.issueDate || undefined })),
      equipment: values.equipment,
    });
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gada_dev_user_id");
      localStorage.removeItem("gada_admin_user_id");
    }
    clear();
    router.push("/login");
  }

  const roleLabel =
    user.role === "WORKER" ? "근로자" :
    user.role === "TEAM_LEADER" ? "팀장" :
    user.role === "EMPLOYER" ? "기업 담당자" : "어드민";

  const roleColor =
    user.role === "EMPLOYER" ? "bg-amber-400/10 text-warning-700 border-warning-200" :
    user.role === "TEAM_LEADER" ? "bg-secondary-50 text-secondary-600 border-purple-200" :
    "bg-primary-500/10 text-primary-500 border-primary-500/20";

  const displayName = profile?.fullName ?? user.phone;

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-6 pb-28">

        {/* ── Hero card ── */}
        <div className="bg-white rounded-lg border border-neutral-100 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar with upload overlay */}
            <div className="relative flex-shrink-0">
              {isUploading ? (
                <div className="h-16 w-16 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                </div>
              ) : profile?.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={displayName}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  {user.role === "WORKER" || user.role === "TEAM_LEADER" ? (
                    <HardHat className="h-8 w-8 text-primary-500" />
                  ) : user.role === "EMPLOYER" ? (
                    <Building2 className="h-8 w-8 text-warning-500" />
                  ) : (
                    <ShieldCheck className="h-8 w-8 text-neutral-500" />
                  )}
                </div>
              )}

              {/* Camera button for workers */}
              {isWorkerRole && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-white border-2 border-neutral-100 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors"
                  title="프로필 사진 변경"
                >
                  <Camera className="h-3.5 w-3.5 text-neutral-600" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleColor}`}>
                  {roleLabel}
                </span>
                {profile?.healthCheckStatus === "COMPLETED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 border border-success-200 px-2 py-0.5 text-xs font-medium text-success-700">
                    <CheckCircle2 className="h-3 w-3" />
                    건강검진 완료
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-neutral-900 truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 text-neutral-400" />
                <p className="text-xs text-neutral-400">{user.phone}</p>
              </div>
            </div>

            {/* Edit button for workers */}
            {isWorkerRole && profile && (
              <button
                onClick={() => setIsEditing(true)}
                className="h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:text-primary-500 hover:border-primary-200 transition-colors flex-shrink-0"
                title="프로필 수정"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick summary for workers */}
          {profile && (profile.nationality || profile.visaType) && (
            <div className="mt-4 pt-4 border-t border-neutral-50 flex flex-wrap gap-2">
              {profile.nationality && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                  {NATIONALITY_FLAGS[profile.nationality]
                    ? <span className="text-sm leading-none">{NATIONALITY_FLAGS[profile.nationality]}</span>
                    : <Globe className="h-3 w-3 text-neutral-400" />}
                  {NATIONALITY_LABELS[profile.nationality] ?? profile.nationality}
                </span>
              )}
              {profile.visaType && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                  {profile.visaType}
                </span>
              )}
              {profile.desiredPayMin && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                  <Briefcase className="h-3 w-3 text-neutral-400" />
                  {profile.desiredPayMin.toLocaleString()}원~
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Mode switcher (TEAM_LEADER only) ── */}
        {user.role === "TEAM_LEADER" && (
          <div className="bg-white rounded-lg border border-neutral-100 shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-neutral-800">활동 모드</p>
                <p className="text-xs text-neutral-400 mt-0.5">근로자와 팀장 모드를 전환할 수 있어요</p>
              </div>
              <ArrowLeftRight className="h-4 w-4 text-neutral-300" />
            </div>
            <div className="flex gap-2">
              {(["WORKER", "TEAM_LEADER"] as const).map((mode) => {
                const isActive = (activeMode ?? "TEAM_LEADER") === mode;
                const icon = mode === "WORKER" ? "👷" : "🦺";
                const label = mode === "WORKER" ? "근로자 모드" : "팀장 모드";
                const desc = mode === "WORKER" ? "채용공고 열람 · 지원" : "팀원 모집 · 스케줄 관리";
                return (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 transition-all ${
                      isActive
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-100 bg-neutral-50 hover:border-neutral-200"
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className={`text-xs font-bold ${isActive ? "text-primary-600" : "text-neutral-600"}`}>
                      {label}
                    </span>
                    <span className="text-[10px] text-neutral-400 text-center leading-tight">{desc}</span>
                    {isActive && (
                      <span className="mt-0.5 rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        현재 모드
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Worker / Team Leader sections ── */}
        {isWorkerRole && (
          <div className="space-y-4 mb-4">
            {profileLoading ? (
              <ProfileSkeleton />
            ) : profile ? (
              <>
                <WorkerProfileContent profile={profile} />
                <TeamSection profile={profile} />
              </>
            ) : (
              <div className="bg-white rounded-lg border border-neutral-100 shadow-sm p-5 text-center">
                <User className="h-10 w-10 text-neutral-200 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">프로필 정보가 없습니다.</p>
                <Link
                  href="/profile/setup"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                >
                  프로필 등록하기
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Employer quick links ── */}
        {user.role === "EMPLOYER" && (
          <div className="bg-white rounded-lg border border-neutral-100 shadow-sm divide-y divide-neutral-50 mb-4">
            {[
              { label: "공고 관리", href: "/employer/jobs" },
              { label: "지원자 관리", href: "/employer/applicants" },
              { label: "회사 정보", href: "/employer/company" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <span>{item.label}</span>
                <ChevronRight className="h-4 w-4 text-neutral-300" />
              </Link>
            ))}
          </div>
        )}

        {/* ── Worker shortcuts ── */}
        {isWorkerRole && (
          <div className="bg-white rounded-lg border border-neutral-100 shadow-sm divide-y divide-neutral-50 mb-4">
            <Link
              href="/applications"
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-neutral-400" />
              <span className="flex-1">내 지원현황</span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </Link>
            <Link
              href="/bookmarks"
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Heart className="h-4 w-4 text-pink-400" />
              <span className="flex-1">찜한 공고</span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </Link>
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Bell className="h-4 w-4 text-neutral-400" />
              <span className="flex-1">알림</span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </Link>
            <Link
              href="/invitations"
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Users className="h-4 w-4 text-neutral-400" />
              <span className="flex-1">팀 초대 현황</span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </Link>
          </div>
        )}

        {/* ── Team leader quick links ── */}
        {(user.role === "TEAM_LEADER" || profile?.role === "TEAM_LEADER") && (
          <div className="bg-white rounded-lg border border-neutral-100 shadow-sm divide-y divide-neutral-50 mb-4">
            <Link
              href="/leader/points"
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Coins className="h-4 w-4 text-primary-500" />
              <span className="flex-1">{t("profile.leaderPoints")}</span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </Link>
            <Link
              href="/leader/payments"
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Receipt className="h-4 w-4 text-neutral-400" />
              <span className="flex-1">{t("profile.leaderPayments")}</span>
              <ChevronRight className="h-4 w-4 text-neutral-300" />
            </Link>
          </div>
        )}

        {/* ── Admin link ── */}
        {user.role === "ADMIN" && (
          <a
            href="http://localhost:3001/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-warning-50 rounded-lg border border-warning-200 px-5 py-3.5 text-sm font-semibold text-warning-700 hover:bg-warning-100 transition-colors mb-4"
          >
            <span>관리자 대시보드 열기</span>
            <span className="text-warning-500">↗</span>
          </a>
        )}

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger-200 bg-white py-3.5 text-sm font-semibold text-danger-500 hover:bg-danger-50 transition-colors shadow-sm"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>

      {/* ── Edit Drawer ── */}
      {isEditing && profile && (
        <EditDrawer
          profile={profile}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveProfile}
          isSaving={updateMutation.isPending}
        />
      )}
    </AppLayout>
  );
}
