"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Users, MapPin, Globe, ChevronRight, Plus, Search,
  SlidersHorizontal, X, ChevronDown, Building2,
  UserSearch, Shield, Wrench, Phone, Award, Briefcase,
  Send,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, type TeamListItem, type TeamsFilter, type TeamResponse } from "@/lib/teams-api";
import { getWorkers, getWorker, type WorkerListItem, type WorkersFilter } from "@/lib/workers-api";
import { useAuthStore } from "@/store/authStore";
import { useCategories } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { equipmentLabel } from "@/lib/equipment-labels";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDO_OPTIONS = [
  "전체", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const PAGE_SIZE = 20;

function countActive(f: TeamsFilter) {
  let n = 0;
  if (f.keyword) n++;
  if (f.sido) n++;
  if (f.teamType) n++;
  if (f.isNationwide) n++;
  if (f.categoryId) n++;
  return n;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TeamRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-neutral-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-2/5 rounded bg-neutral-200" />
        <div className="h-3 w-3/5 rounded bg-neutral-100" />
      </div>
      <div className="h-3 w-8 rounded bg-neutral-100" />
    </div>
  );
}

// ─── Team list row ────────────────────────────────────────────────────────────

function TeamRow({ team, isMyTeam = false }: { team: TeamListItem; isMyTeam?: boolean }) {
  const t = useT();
  const isCompany = team.teamType === "COMPANY_LINKED";

  const regionText = team.isNationwide
    ? null
    : team.regions
        ?.slice(0, 2)
        .map((r) =>
          r.sido
            .replace("특별시", "")
            .replace("광역시", "")
            .replace("특별자치시", "")
        )
        .join(" · ") + (team.regions?.length > 2 ? ` 외 ${team.regions.length - 2}` : "");

  return (
    <Link
      href={`/teams/${team.publicId}`}
      className="group flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white",
          isCompany ? "bg-secondary-500" : "bg-primary-500"
        )}
      >
        {team.name.charAt(0)}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
            {team.name}
          </span>
          <span
            className={cn(
              "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
              isCompany
                ? "bg-secondary-100 text-secondary-600"
                : "bg-primary-50 text-primary-500"
            )}
          >
            {isCompany ? t("teams.affiliated") : t("teams.squad")}
          </span>
          {isMyTeam && (
            <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-warning-100 text-warning-700">
              {t("teams.myTeamBadge")}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          {team.isNationwide ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-success-700">
              <Globe className="h-3 w-3" />
              {t("teams.nationwide")}
            </span>
          ) : regionText ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400">
              <MapPin className="h-3 w-3" />
              {regionText}
            </span>
          ) : null}

          <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400">
            <Users className="h-3 w-3" />
            {team.memberCount}{t("teams.persons")}
          </span>

          {team.introShort && (
            <span className="hidden sm:block text-xs text-neutral-400 truncate max-w-[220px]">
              · {team.introShort}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300 group-hover:text-primary-400 transition-colors" />
    </Link>
  );
}

// ─── Region dropdown (GADA design system) ────────────────────────────────────

function RegionDropdown({
  value,
  options,
  allLabel,
  onChange,
}: {
  value: string;
  options: string[];
  allLabel: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isSelected = value !== allLabel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
          isSelected
            ? "border-primary-300 bg-primary-50 text-primary-700"
            : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50",
          open && "border-primary-400 ring-2 ring-primary-100"
        )}
      >
        <div className="flex items-center gap-2">
          <MapPin className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-primary-500" : "text-neutral-400")} />
          <span>{value}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform", open && "rotate-180", isSelected ? "text-primary-400" : "text-neutral-400")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
          {options.map((opt, i) => {
            const optVal = i === 0 ? allLabel : opt;
            const active = value === optVal;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(optVal); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary-50 font-semibold text-primary-600"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
              >
                {opt}
                {active && (
                  <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Filter panel content ─────────────────────────────────────────────────────

function FilterContent({
  value,
  onChange,
  onClose,
}: {
  value: TeamsFilter;
  onChange: (f: TeamsFilter) => void;
  onClose?: () => void;
}) {
  const t = useT();
  const { locale } = useLocaleStore();
  const { data: categories } = useCategories();

  const TEAM_TYPE_OPTIONS = [
    { value: "", label: t("teams.filterAll") },
    { value: "SQUAD", label: t("teams.filterTypeSquad") },
    { value: "COMPANY_LINKED", label: t("teams.filterTypeAffiliated") },
  ];

  const SIDO_ALL = t("teams.filterAll");

  return (
    <div className="flex flex-col gap-5">
      {/* Mobile header */}
      {onClose && (
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-neutral-950">{t("teams.filter")}</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
      )}

      {/* 지역 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">{t("teams.filterRegion")}</p>
        <RegionDropdown
          value={value.sido ?? SIDO_ALL}
          options={SIDO_OPTIONS}
          allLabel={SIDO_ALL}
          onChange={(v) => onChange({ ...value, sido: v === SIDO_ALL ? undefined : v, page: 0 })}
        />
      </div>

      {/* 팀 유형 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">{t("teams.filterType")}</p>
        <div className="flex flex-col gap-1">
          {TEAM_TYPE_OPTIONS.map((opt) => {
            const checked = (value.teamType ?? "") === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  checked ? "bg-primary-50 text-primary-600" : "hover:bg-neutral-50"
                )}
              >
                <input
                  type="radio"
                  name="teamType"
                  checked={checked}
                  onChange={() =>
                    onChange({ ...value, teamType: opt.value || undefined, page: 0 })
                  }
                  className="h-4 w-4 accent-primary-500"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 전국 모집 */}
      <div>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors",
            value.isNationwide
              ? "border-primary-200 bg-primary-50 text-primary-600"
              : "border-neutral-200 hover:bg-neutral-50"
          )}
        >
          <input
            type="checkbox"
            checked={!!value.isNationwide}
            onChange={() =>
              onChange({ ...value, isNationwide: value.isNationwide ? undefined : true, page: 0 })
            }
            className="h-4 w-4 rounded accent-primary-500"
          />
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">{t("teams.filterNationwideLabel")}</span>
          </div>
        </label>
      </div>

      {/* 직종 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">{t("teams.filterCategory")}</p>
        {!categories ? (
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {categories.map((cat) => {
              const active = value.categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    onChange({ ...value, categoryId: active ? undefined : cat.id, page: 0 })
                  }
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-xs font-medium text-center transition-all truncate",
                    active
                      ? "bg-primary-500 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  {locale === "en" && (cat as any).nameEn ? (cat as any).nameEn : locale === "vi" && (cat as any).nameVi ? (cat as any).nameVi : cat.nameKo}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ page: 0, size: PAGE_SIZE })}
        className="mt-1 w-full rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
      >
        {t("teams.filterReset")}
      </button>
    </div>
  );
}

// ─── Mobile filter bottom sheet ───────────────────────────────────────────────

function FilterSheet({
  isOpen,
  onClose,
  filter,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filter: TeamsFilter;
  onApply: (f: TeamsFilter) => void;
}) {
  const t = useT();
  const [local, setLocal] = React.useState<TeamsFilter>(filter);

  React.useEffect(() => {
    if (isOpen) setLocal(filter);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const activeCount = countActive(local);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-card-xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 flex-shrink-0">
          <span className="text-base font-semibold text-neutral-950">{t("teams.filterSettings")}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocal({ page: 0, size: PAGE_SIZE })} className="text-sm text-neutral-500 hover:text-neutral-700">
              {t("teams.filterReset")}
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <FilterContent value={local} onChange={setLocal} />
        </div>
        <div className="flex-shrink-0 border-t border-neutral-100 bg-white px-5 py-4 flex gap-3">
          <button
            onClick={() => { setLocal({ page: 0, size: PAGE_SIZE }); }}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            {t("teams.filterReset")}
          </button>
          <button
            onClick={() => { onApply({ ...local, page: 0 }); onClose(); }}
            className="flex-[2] rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {activeCount > 0 ? t("teams.filterApplyCount" as any, activeCount) : t("teams.filterApply")}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Active filter chips ──────────────────────────────────────────────────────

function ActiveFilterChips({
  filter,
  onChange,
  categories,
}: {
  filter: TeamsFilter;
  onChange: (f: TeamsFilter) => void;
  categories?: { id: number; nameKo: string; nameEn?: string | null; nameVi?: string | null }[];
}) {
  const t = useT();
  const { locale } = useLocaleStore();
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filter.sido) {
    chips.push({ label: filter.sido, onRemove: () => onChange({ ...filter, sido: undefined, page: 0 }) });
  }
  if (filter.teamType) {
    const label = filter.teamType === "SQUAD" ? t("teams.filterTypeSquad") : t("teams.filterTypeAffiliated");
    chips.push({ label, onRemove: () => onChange({ ...filter, teamType: undefined, page: 0 }) });
  }
  if (filter.isNationwide) {
    chips.push({ label: t("teams.filterNationwideChip"), onRemove: () => onChange({ ...filter, isNationwide: undefined, page: 0 }) });
  }
  if (filter.categoryId && categories) {
    const cat = categories.find((c) => c.id === filter.categoryId);
    if (cat) {
      const catName = locale === "en" && cat.nameEn ? cat.nameEn : locale === "vi" && cat.nameVi ? cat.nameVi : cat.nameKo;
      chips.push({ label: catName, onRemove: () => onChange({ ...filter, categoryId: undefined, page: 0 }) });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        onClick={() => onChange({ page: 0, size: PAGE_SIZE })}
        className="text-xs text-neutral-400 hover:text-neutral-600 px-1 underline underline-offset-2"
      >
        {t("teams.filterResetAll")}
      </button>
    </div>
  );
}

// ─── Locale-aware label helpers ───────────────────────────────────────────────

const HEALTH_CLASSES: Record<string, string> = {
  COMPLETED: "bg-success-50 text-success-700",
  NOT_DONE:  "bg-neutral-100 text-neutral-500",
  SCHEDULED: "bg-warning-50 text-warning-700",
  EXPIRED:   "bg-danger-50 text-danger-600",
};

// ─── Worker list row ──────────────────────────────────────────────────────────

function WorkerRow({ worker, onClick }: { worker: WorkerListItem; onClick: () => void }) {
  const t = useT();
  const healthClass = HEALTH_CLASSES[worker.healthCheckStatus] ?? "bg-neutral-100 text-neutral-500";
  const healthLabel = t(`health.${worker.healthCheckStatus}` as any) || worker.healthCheckStatus;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {worker.profileImageUrl ? (
          <img
            src={worker.profileImageUrl}
            alt={worker.fullName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
            {worker.fullName.charAt(0)}
          </div>
        )}
        {worker.isTeamLeader && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning-500 ring-2 ring-white">
            <Shield className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-neutral-900 truncate">
            {worker.fullName}
          </span>
          {worker.isTeamLeader && (
            <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-warning-100 text-warning-700">
              {t("teams.leaderBadge")}
            </span>
          )}
          {worker.healthCheckStatus && (
            <span className={cn("flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none", healthClass)}>
              {healthLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <span className="text-xs text-neutral-400">
            {t(`visa.${worker.visaType}` as any) || worker.visaType}
          </span>
          {worker.teamName && (
            <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400">
              <Users className="h-3 w-3" />
              {worker.teamName}
            </span>
          )}
          {(worker.desiredPayMin || worker.desiredPayMax) && (
            <span className="text-xs text-neutral-400">
              {worker.desiredPayMin ? `${worker.desiredPayMin.toLocaleString("ko-KR")}원~` : ""}
              {worker.desiredPayMax ? `${worker.desiredPayMax.toLocaleString("ko-KR")}원` : ""}
              {worker.desiredPayUnit ? `/${t(`payUnit.${worker.desiredPayUnit}` as any) || worker.desiredPayUnit}` : ""}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300 group-hover:text-primary-400 transition-colors" />
    </button>
  );
}

function WorkerRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-1/3 rounded bg-neutral-200" />
        <div className="h-3 w-1/2 rounded bg-neutral-100" />
      </div>
    </div>
  );
}

// ─── Worker filter panel ──────────────────────────────────────────────────────

const NATIONALITY_CODES = ["KR", "VN", "PH", "ID", "TH", "MN", "UZ", "KZ"] as const;
const VISA_CODES = ["CITIZEN", "H2", "E9", "F4", "F5", "F6", "E7", "OTHER"] as const;

function WorkerFilterContent({
  value,
  onChange,
  onClose,
}: {
  value: WorkersFilter;
  onChange: (f: WorkersFilter) => void;
  onClose?: () => void;
}) {
  const t = useT();

  const nationalityOptions = [
    { value: "", label: t("nationality.all") },
    ...NATIONALITY_CODES.map((c) => ({ value: c, label: t(`nationality.${c}` as any) || c })),
  ];

  const visaOptions = [
    { value: "", label: t("visa.all") },
    ...VISA_CODES.map((c) => ({ value: c, label: t(`visa.${c}` as any) || c })),
  ];

  return (
    <div className="flex flex-col gap-5">
      {onClose && (
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-neutral-950">{t("teams.filter")}</span>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
      )}

      {/* 국적 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">{t("teams.filterNationality")}</p>
        <div className="relative">
          <select
            value={value.nationality ?? ""}
            onChange={(e) => onChange({ ...value, nationality: e.target.value || undefined, page: 0 })}
            className="w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-neutral-800 focus:border-primary-500 focus:outline-none"
          >
            {nationalityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      {/* 비자 유형 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">{t("teams.filterVisa")}</p>
        <div className="flex flex-col gap-1">
          {visaOptions.map((opt) => {
            const checked = (value.visaType ?? "") === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  checked ? "bg-primary-50 text-primary-600" : "hover:bg-neutral-50"
                )}
              >
                <input
                  type="radio"
                  name="workerVisaType"
                  checked={checked}
                  onChange={() => onChange({ ...value, visaType: opt.value || undefined, page: 0 })}
                  className="h-4 w-4 accent-primary-500"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onChange({ page: 0, size: 20 })}
        className="mt-1 w-full rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
      >
        {t("teams.filterReset")}
      </button>
    </div>
  );
}

function WorkerFilterSheet({
  isOpen,
  onClose,
  filter,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filter: WorkersFilter;
  onApply: (f: WorkersFilter) => void;
}) {
  const t = useT();
  const [local, setLocal] = React.useState<WorkersFilter>(filter);

  React.useEffect(() => { if (isOpen) setLocal(filter); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCount = [local.nationality, local.visaType].filter(Boolean).length;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-card-xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 flex-shrink-0">
          <span className="text-base font-semibold text-neutral-950">{t("teams.filterSettings")}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocal({ page: 0, size: 20 })} className="text-sm text-neutral-500 hover:text-neutral-700">{t("common.reset")}</button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <WorkerFilterContent value={local} onChange={setLocal} />
        </div>
        <div className="flex-shrink-0 border-t border-neutral-100 bg-white px-5 py-4 flex gap-3">
          <button onClick={() => setLocal({ page: 0, size: 20 })} className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">{t("teams.filterReset")}</button>
          <button onClick={() => { onApply({ ...local, page: 0 }); onClose(); }} className="flex-[2] rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            {activeCount > 0 ? t("teams.filterApplyCount" as any, activeCount) : t("teams.filterApply")}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Worker detail sheet ──────────────────────────────────────────────────────


function WorkerDetailSheet({
  publicId,
  onClose,
}: {
  publicId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const isOpen = !!publicId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["worker", publicId],
    queryFn: () => getWorker(publicId!),
    enabled: isOpen,
  });

  const [contactOpen, setContactOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Reset contact sub-view when sheet closes
  React.useEffect(() => {
    if (!isOpen) setContactOpen(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const healthClassName = profile ? (HEALTH_CLASSES[profile.healthCheckStatus] ?? "bg-neutral-100 text-neutral-500") : null;
  const healthLabel = profile ? (t(`health.${profile.healthCheckStatus}` as any) || profile.healthCheckStatus) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-white shadow-card-xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 flex-shrink-0">
          <span className="text-base font-semibold text-neutral-950">
            {contactOpen ? t("teams.contactTitle") : t("teams.workerDetailTitle")}
          </span>
          <div className="flex items-center gap-2">
            {contactOpen && (
              <button
                onClick={() => setContactOpen(false)}
                className="text-sm text-neutral-500 hover:text-neutral-700 px-2"
              >
                {t("teams.contactBack")}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-4 px-5 py-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-neutral-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-neutral-200" />
                  <div className="h-3 w-1/2 rounded bg-neutral-100" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : !profile ? (
            <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
              <UserSearch className="h-10 w-10 text-neutral-200 mb-3" />
              <p className="text-sm text-neutral-500">{t("teams.profileError")}</p>
            </div>
          ) : contactOpen ? (
            /* ── Contact sub-view ── */
            <div className="px-5 py-6 space-y-5">
              {/* Leader summary */}
              <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt={profile.fullName} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-base font-bold text-white flex-shrink-0">
                    {profile.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-neutral-900">{profile.fullName}</p>
                  {profile.teamName && (
                    <p className="text-sm text-neutral-500">{profile.teamName} {t("teams.leaderRole")}</p>
                  )}
                </div>
              </div>

              {/* Step guide */}
              <div className="space-y-3">
                {[
                  { step: "01", title: t("teams.contactStep1Title"), desc: t("teams.contactStep1Desc") },
                  { step: "02", title: t("teams.contactStep2Title"), desc: t("teams.contactStep2Desc") },
                  { step: "03", title: t("teams.contactStep3Title"), desc: t("teams.contactStep3Desc") },
                ].map((s) => (
                  <div key={s.step} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-600">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{s.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {profile.teamPublicId && (
                <Link
                  href={`/teams/${profile.teamPublicId}`}
                  onClick={onClose}
                  className="block w-full rounded-xl bg-primary-500 py-3.5 text-center text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  {t("teams.goToTeamPage")}
                </Link>
              )}
            </div>
          ) : (
            /* ── Profile main view ── */
            <div className="px-5 py-6 space-y-5">
              {/* Avatar + name + badges */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {profile.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt={profile.fullName} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-xl font-bold text-white">
                      {profile.fullName.charAt(0)}
                    </div>
                  )}
                  {profile.isTeamLeader && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning-500 ring-2 ring-white">
                      <Shield className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-lg font-bold text-neutral-900">{profile.fullName}</h2>
                    {profile.isTeamLeader && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-warning-100 text-warning-700">
                        {t("teams.leaderBadge")}
                      </span>
                    )}
                    {healthClassName && healthLabel && (
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none", healthClassName)}>
                        {healthLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {t(`nationality.${profile.nationality}` as any) || profile.nationality} · {t(`visa.${profile.visaType}` as any) || profile.visaType}
                  </p>
                  {profile.teamName && (
                    <p className="mt-0.5 text-sm text-primary-600 font-medium">{profile.teamName}</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                  <p className="text-sm leading-relaxed text-neutral-600">{profile.bio}</p>
                </div>
              )}

              {/* Pay expectation */}
              {(profile.desiredPayMin || profile.desiredPayMax) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("teams.desiredPay")}</p>
                  <p className="text-sm font-semibold text-neutral-800">
                    {profile.desiredPayMin ? `${profile.desiredPayMin.toLocaleString("ko-KR")}원` : ""}
                    {profile.desiredPayMin && profile.desiredPayMax ? " ~ " : ""}
                    {profile.desiredPayMax ? `${profile.desiredPayMax.toLocaleString("ko-KR")}원` : ""}
                    {profile.desiredPayUnit ? ` / ${t(`payUnit.${profile.desiredPayUnit}` as any) || profile.desiredPayUnit}` : ""}
                  </p>
                </div>
              )}

              {/* Languages */}
              {profile.languages.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("teams.workerLanguages")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages.map((l, i) => (
                      <span key={i} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600">
                        {l.code} · {t(`langLevel.${l.level}` as any) || l.level}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("teams.workerCerts")}</p>
                  <div className="space-y-1.5">
                    {profile.certifications.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Award className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                        <div>
                          <p className="text-sm font-medium text-neutral-800">{c.name}</p>
                          {(c.issueDate || c.expiryDate) && (
                            <p className="text-xs text-neutral-400">
                              {[c.issueDate, c.expiryDate].filter(Boolean).join(" ~ ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {profile.equipment.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("teams.workerEquipment")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.equipment.map((eq, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600">
                        <Wrench className="h-3 w-3 text-neutral-400" />
                        {equipmentLabel(eq)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {!isLoading && profile && !contactOpen && profile.isTeamLeader && (
          <div className="flex-shrink-0 border-t border-neutral-100 bg-white px-5 py-4">
            <button
              onClick={() => setContactOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              <Phone className="h-4 w-4" />
              {t("teams.contactTitle")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Workers tab content ──────────────────────────────────────────────────────

function WorkersTabContent() {
  const t = useT();
  const [filter, setFilter] = React.useState<WorkersFilter>({ page: 0, size: 20 });
  const [keyword, setKeyword] = React.useState("");
  const [showSheet, setShowSheet] = React.useState(false);
  const [selectedWorkerPublicId, setSelectedWorkerPublicId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((f) => ({ ...f, keyword: keyword.trim() || undefined, page: 0 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["workers", filter],
    queryFn: ({ pageParam = 0 }) => getWorkers({ ...filter, page: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
  });

  const workers = data?.pages.flatMap((p) => p.content) ?? [];
  const total = data?.pages[0]?.totalElements ?? 0;
  const activeFilterCount = [filter.nationality, filter.visaType].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-neutral-950">{t("teams.workersTitle")}</h1>
        {total > 0 && (
          <p className="mt-0.5 text-sm text-neutral-500">{t("teams.workersCountLabel" as any, total)}</p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder={t("teams.workersSearch")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        {keyword && (
          <button onClick={() => setKeyword("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {(filter.nationality || filter.visaType) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filter.nationality && (
            <button
              onClick={() => setFilter((f) => ({ ...f, nationality: undefined, page: 0 }))}
              className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors"
            >
              {t(`nationality.${filter.nationality}` as any) || filter.nationality}
              <X className="h-3 w-3" />
            </button>
          )}
          {filter.visaType && (
            <button
              onClick={() => setFilter((f) => ({ ...f, visaType: undefined, page: 0 }))}
              className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors"
            >
              {t(`visa.${filter.visaType}` as any) || filter.visaType}
              <X className="h-3 w-3" />
            </button>
          )}
          <button onClick={() => setFilter({ page: 0, size: 20 })} className="text-xs text-neutral-400 hover:text-neutral-600 px-1 underline underline-offset-2">{t("teams.filterResetAll")}</button>
        </div>
      )}

      <div className="flex items-start gap-5">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block sticky top-[72px] w-60 flex-shrink-0 self-start rounded-lg border border-neutral-100 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-bold text-neutral-950">{t("teams.filter")}</p>
          <WorkerFilterContent value={filter} onChange={setFilter} />
        </aside>

        {/* List */}
        <div className="min-w-0 flex-1">
          {/* Mobile filter button */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <p className="text-sm text-neutral-500">
              {isLoading ? <span className="inline-block h-4 w-20 animate-pulse rounded bg-neutral-200" /> : t("teams.workersCountLabel" as any, total)}
            </p>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("teams.filter")}
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <p className="hidden lg:block text-sm text-neutral-500 mb-3">
            {!isLoading && t("teams.workersCountLabel" as any, total)}
          </p>

          <div className="rounded-lg border border-neutral-100 bg-white overflow-hidden shadow-sm divide-y divide-neutral-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <WorkerRowSkeleton key={i} />)
            ) : workers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <UserSearch className="mb-4 h-10 w-10 text-neutral-200" />
                <p className="text-sm font-bold text-neutral-600">{t("teams.workersEmpty")}</p>
                <p className="mt-1 text-xs text-neutral-400">{t("teams.workersEmptyDesc")}</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilter({ page: 0, size: 20 })}
                    className="mt-4 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                  >
                    {t("teams.filterReset")}
                  </button>
                )}
              </div>
            ) : (
              workers.map((w) => (
                <WorkerRow
                  key={w.publicId}
                  worker={w}
                  onClick={() => setSelectedWorkerPublicId(w.publicId)}
                />
              ))
            )}
          </div>

          {(hasNextPage || isFetchingNextPage) && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-8 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isFetchingNextPage ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-500" />
                    {t("common.loading")}...
                  </>
                ) : (
                  t("common.loadMore")
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <WorkerFilterSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        filter={filter}
        onApply={setFilter}
      />

      <WorkerDetailSheet
        publicId={selectedWorkerPublicId}
        onClose={() => setSelectedWorkerPublicId(null)}
      />
    </div>
  );
}

// ─── Page Content ──────────────────────────────────────────────────────────────

function TeamsPageContent() {
  const t = useT();
  const { user } = useAuthStore();
  const { data: categories } = useCategories();

  const [filter, setFilter] = React.useState<TeamsFilter>({ page: 0, size: PAGE_SIZE });
  const [keyword, setKeyword] = React.useState("");
  const [showSheet, setShowSheet] = React.useState(false);

  // Debounced keyword → filter
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((f) => ({ ...f, keyword: keyword.trim() || undefined, page: 0 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["teams", filter],
    queryFn: ({ pageParam = 0 }) => teamsApi.getTeams({ ...filter, page: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
  });

  const myTeamQuery = useQuery({
    queryKey: ["my-team"],
    queryFn: () => teamsApi.getMyTeam(),
    enabled: user?.role === "TEAM_LEADER",
  });
  const myTeamPublicId = myTeamQuery.data?.publicId;

  const teams = data?.pages.flatMap((p) => p.content) ?? [];
  const total = data?.pages[0]?.totalElements ?? 0;
  const activeCount = countActive(filter);

  function handleFilterChange(f: TeamsFilter) {
    setFilter(f);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-950">{t("teams.title")}</h1>
          {total > 0 && (
            <p className="mt-0.5 text-sm text-neutral-500">
              {t("teams.countLabel" as any, total)}
            </p>
          )}
        </div>
        {(user?.role === "WORKER" || user?.role === "TEAM_LEADER") && (
          <Link
            href="/teams/new"
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("teams.createTeam")}
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder={t("teams.searchPlaceholder")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        {keyword && (
          <button
            onClick={() => setKeyword("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips filter={filter} onChange={handleFilterChange} categories={categories} />

      <div className="flex items-start gap-5">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block sticky top-[72px] w-60 flex-shrink-0 self-start rounded-lg border border-neutral-100 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-bold text-neutral-950">{t("teams.filter")}</p>
          <FilterContent value={filter} onChange={handleFilterChange} />
        </aside>

        {/* Team list */}
        <div className="min-w-0 flex-1">
          {/* Mobile filter button */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <p className="text-sm text-neutral-500">
              {isLoading ? (
                <span className="inline-block h-4 w-20 animate-pulse rounded bg-neutral-200" />
              ) : (
                t("teams.countLabel" as any, total)
              )}
            </p>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("teams.filter")}
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop result count */}
          <p className="hidden lg:block text-sm text-neutral-500 mb-3">
            {!isLoading && t("teams.countLabel" as any, total)}
          </p>

          {/* List container */}
          <div className="rounded-lg border border-neutral-100 bg-white overflow-hidden shadow-sm divide-y divide-neutral-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <TeamRowSkeleton key={i} />)
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <Users className="mb-4 h-10 w-10 text-neutral-200" />
                <p className="text-sm font-bold text-neutral-600">{t("teams.empty")}</p>
                <p className="mt-1 text-xs text-neutral-400">{t("teams.emptyDesc")}</p>
                {activeCount > 0 && (
                  <button
                    onClick={() => handleFilterChange({ page: 0, size: PAGE_SIZE })}
                    className="mt-4 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                  >
                    {t("teams.filterReset")}
                  </button>
                )}
                {(user?.role === "WORKER" || user?.role === "TEAM_LEADER") && activeCount === 0 && (
                  <Link
                    href="/teams/new"
                    className="mt-4 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {t("teams.createTeam")}
                  </Link>
                )}
              </div>
            ) : (
              teams.map((team) => (
                <TeamRow
                  key={team.publicId}
                  team={team}
                  isMyTeam={!!myTeamPublicId && team.publicId === myTeamPublicId}
                />
              ))
            )}
          </div>

          {/* Load more */}
          {(hasNextPage || isFetchingNextPage) && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-8 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isFetchingNextPage ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-500" />
                    {t("common.loading")}...
                  </>
                ) : (
                  t("common.loadMore")
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <FilterSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        filter={filter}
        onApply={handleFilterChange}
      />
    </div>
  );
}

// ─── My Team Tab ──────────────────────────────────────────────

function MyTeamTab() {
  const t = useT();
  const { data: team, isLoading, isError } = useQuery({
    queryKey: ["my-team"],
    queryFn: () => teamsApi.getMyTeam(),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-neutral-100 bg-white p-6 animate-pulse space-y-3">
          <div className="h-5 w-1/3 rounded bg-neutral-200" />
          <div className="h-4 w-2/3 rounded bg-neutral-100" />
          <div className="h-4 w-1/2 rounded bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-neutral-200" />
        <p className="font-semibold text-neutral-700">{t("teams.empty")}</p>
        <p className="mt-1 text-sm text-neutral-400">{t("teams.emptyDesc")}</p>
        <Link
          href="/teams/create"
          className="mt-5 inline-block rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          {t("teams.createTeam")}
        </Link>
      </div>
    );
  }

  const isCompany = team.teamType === "COMPANY_LINKED";
  const regionText = team.isNationwide
    ? null
    : team.regions
        ?.slice(0, 3)
        .map((r) => r.sido.replace("특별시", "").replace("광역시", "").replace("특별자치시", ""))
        .join(" · ");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-card-md">
        {/* Cover / Hero */}
        <div className="relative h-28 overflow-hidden">
          {team.coverImageUrl ? (
            <>
              <img src={team.coverImageUrl} alt={team.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/40" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary-500 to-primary-600" />
          )}
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-white">{team.name}</h2>
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold text-white",
                isCompany ? "bg-secondary-500/90" : "bg-white/20 backdrop-blur-sm"
              )}>
                {isCompany ? t("teamDetail.companyType") : t("teamDetail.squadType")}
              </span>
            </div>
            {team.introShort && (
              <p className="mt-0.5 text-xs text-white/80 line-clamp-1">{team.introShort}</p>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("teams.persons")}</p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">
              {team.memberCount}{t("teams.persons")}
              {team.headcountTarget ? ` / ${team.headcountTarget}${t("teams.persons")}` : ""}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("teamDetail.region")}</p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">
              {team.isNationwide ? (
                <span className="text-success-700">{t("teamDetail.nationwide")}</span>
              ) : (regionText ?? "—")}
            </p>
          </div>
          {(team.desiredPayMin || team.desiredPayMax) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("teamDetail.desiredPay")}</p>
              <p className="mt-0.5 text-sm font-semibold text-primary-600">
                {team.desiredPayMin?.toLocaleString("ko-KR")}
                {team.desiredPayMax ? `~${team.desiredPayMax.toLocaleString("ko-KR")}원` : "원~"}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">상태</p>
            <p className={cn("mt-0.5 text-sm font-semibold", team.status === "ACTIVE" ? "text-success-700" : "text-neutral-400")}>
              {team.status === "ACTIVE" ? t("teamDetail.activeStatus") : t("teamDetail.dissolvedStatus")}
            </p>
          </div>
        </div>

        {/* Members preview */}
        {team.members && team.members.length > 0 && (
          <div className="border-t border-neutral-100 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("teamDetail.memberPreview")}</p>
            <div className="flex flex-wrap gap-2">
              {team.members.slice(0, 6).map((m) => (
                <div key={m.memberId} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white">
                    {(m.fullName ?? "?").charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-neutral-700">{m.fullName ?? "—"}</span>
                  {m.role === "LEADER" && (
                    <span className="text-[9px] font-semibold text-warning-700">({t("teamDetail.leaderLabel")})</span>
                  )}
                </div>
              ))}
              {team.members.length > 6 && (
                <span className="self-center text-xs text-neutral-400">
                  {`외 ${team.members.length - 6}명`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-neutral-100 p-5 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/teams/${team.publicId}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            팀 상세 보기
          </Link>
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-sm font-semibold text-neutral-400 cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {t("teamDetail.leaderBelongs")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs wrapper ─────────────────────────────────────────────────────────────

type TabId = "teams" | "workers" | "myteam";

function TabsWrapper() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<TabId>("teams");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Only evaluate isLeader after mount to avoid SSR/hydration mismatch.
  // On the server user is always null; adding the tab only on the client
  // prevents React from throwing a hydration error.
  const isLeader = mounted && user?.role === "TEAM_LEADER";

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "teams", label: t("teams.tabTeams"), icon: Users },
    { id: "workers", label: t("teams.tabWorkers"), icon: UserSearch },
    ...(isLeader ? [{ id: "myteam" as TabId, label: t("teams.tabMyTeam"), icon: Shield }] : []),
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="sticky top-14 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl px-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                tab === id
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "teams" ? <TeamsPageContent /> : tab === "workers" ? <WorkersTabContent /> : <MyTeamTab />}
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  return (
    <AppLayout>
      <TabsWrapper />
    </AppLayout>
  );
}
