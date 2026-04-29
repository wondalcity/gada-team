"use client";

import * as React from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useJobs";
import { LocationPicker } from "./LocationPicker";
import { useT } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import type { JobsFilter } from "@/lib/jobs-api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDO_VALUES = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const VISA_TYPE_VALUES = ["CITIZEN", "H2", "E9", "E7", "F4", "F5", "F6", "OTHER"] as const;

// ─── Filter panel content ─────────────────────────────────────────────────────

function FilterContent({
  value,
  onChange,
  onClose,
}: {
  value: JobsFilter;
  onChange: (f: JobsFilter) => void;
  onClose?: () => void;
}) {
  const t = useT();
  const { locale } = useLocaleStore();
  const { data: categories } = useCategories();
  const rootCategories = categories ?? [];

  const PAY_UNIT_OPTIONS = [
    { value: "", label: t("filter.payAll") },
    { value: "HOURLY", label: t("filter.payHourly") },
    { value: "DAILY", label: t("filter.payDaily") },
    { value: "WEEKLY", label: t("filter.payWeekly") },
    { value: "MONTHLY", label: t("filter.payMonthly") },
    { value: "LUMP_SUM", label: t("filter.payLump") },
  ];

  const VISA_TYPE_OPTIONS = [
    { value: "CITIZEN", label: t("visa.CITIZEN") },
    { value: "H2", label: "H-2" },
    { value: "E9", label: "E-9" },
    { value: "E7", label: "E-7" },
    { value: "F4", label: "F-4" },
    { value: "F5", label: "F-5" },
    { value: "F6", label: "F-6" },
    { value: "OTHER", label: t("visa.OTHER") },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header (mobile only) */}
      {onClose && (
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-neutral-950">{t("common.filter")}</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>
      )}

      {/* 위치 검색 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.locationSearch")}</p>
        <LocationPicker
          lat={value.lat}
          lng={value.lng}
          radius={value.radius ?? 10}
          onLocationChange={(lat, lng) =>
            onChange({
              ...value,
              lat,
              lng,
              radius: value.radius ?? 10,
              page: 0,
            })
          }
          onRadiusChange={(radius) =>
            onChange({ ...value, radius, page: 0 })
          }
          onClear={() =>
            onChange({ ...value, lat: undefined, lng: undefined, radius: undefined, page: 0 })
          }
        />
      </div>

      {/* 지역 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.region")}</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...value, sido: undefined, sigungu: undefined, page: 0 })}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              !value.sido
                ? "bg-primary-500 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {t("filter.regionAll")}
          </button>
          {SIDO_VALUES.map((sido) => {
            const active = value.sido === sido;
            return (
              <button
                key={sido}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    sido: active ? undefined : sido,
                    sigungu: undefined,
                    page: 0,
                  })
                }
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {sido}
              </button>
            );
          })}
        </div>
        {value.sido && (
          <input
            type="text"
            placeholder={t("filter.sigungu")}
            value={value.sigungu ?? ""}
            onChange={(e) =>
              onChange({ ...value, sigungu: e.target.value || undefined, page: 0 })
            }
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        )}
      </div>

      {/* 직종 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.category")}</p>
        {rootCategories.length === 0 ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-neutral-100"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rootCategories.map((cat) => {
              const checked = value.categoryId === cat.id;
              return (
                <label
                  key={cat.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    checked
                      ? "bg-primary-500/8 text-primary-500"
                      : "hover:bg-neutral-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...value,
                        categoryId: checked ? undefined : cat.id,
                        page: 0,
                      })
                    }
                    className="h-4 w-4 rounded border-neutral-300 accent-primary-500"
                  />
                  <span className="text-sm font-medium">
                    {locale === "vi" ? (cat.nameVi ?? cat.nameKo) : locale === "en" ? (cat.nameEn ?? cat.nameKo) : cat.nameKo}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 지원 방식 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.appType")}</p>
        <div className="flex flex-col gap-1.5">
          {(
            [
              { value: "INDIVIDUAL", label: t("filter.individual") },
              { value: "TEAM", label: t("filter.team") },
              { value: "COMPANY", label: t("filter.company") },
            ] as const
          ).map((opt) => {
            const checked = value.applicationType === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  checked
                    ? "bg-primary-500/8 text-primary-500"
                    : "hover:bg-neutral-50"
                )}
              >
                <input
                  type="radio"
                  name="applicationType"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...value,
                      applicationType: checked ? undefined : opt.value,
                      page: 0,
                    })
                  }
                  className="h-4 w-4 accent-primary-500"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 급여 단위 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.payUnit")}</p>
        <div className="flex flex-col gap-1.5">
          {PAY_UNIT_OPTIONS.map((opt) => {
            const checked = (value.payUnit ?? "") === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  checked
                    ? "bg-primary-500/8 text-primary-500"
                    : "hover:bg-neutral-50"
                )}
              >
                <input
                  type="radio"
                  name="payUnit"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...value,
                      payUnit: opt.value || undefined,
                      page: 0,
                    })
                  }
                  className="h-4 w-4 accent-primary-500"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            );
          })}
        </div>

        {/* Pay range inputs */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              placeholder={t("profile.payMin")}
              value={value.payMin ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  payMin: e.target.value ? Number(e.target.value) : undefined,
                  page: 0,
                })
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{t("filter.currencyUnit")}</span>
          </div>
          <span className="text-neutral-400">~</span>
          <div className="relative flex-1">
            <input
              type="number"
              placeholder={t("profile.payMax")}
              value={value.payMax ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  payMax: e.target.value ? Number(e.target.value) : undefined,
                  page: 0,
                })
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{t("filter.currencyUnit")}</span>
          </div>
        </div>
      </div>

      {/* 비자 조건 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.visaCondition")}</p>
        <div className="flex flex-wrap gap-2">
          {VISA_TYPE_OPTIONS.map((opt) => {
            const active = value.visaType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    visaType: active ? undefined : opt.value,
                    page: 0,
                  })
                }
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 복지 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.welfare")}</p>
        <div className="flex flex-col gap-1.5">
          {(
            [
              { key: "accommodationProvided", label: t("filter.accommodation") },
              { key: "mealProvided", label: t("filter.meal") },
              { key: "transportationProvided", label: t("filter.transport") },
            ] as const
          ).map(({ key, label }) => {
            const checked = value[key] === true;
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  checked
                    ? "bg-primary-500/8 text-primary-500"
                    : "hover:bg-neutral-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...value,
                      [key]: checked ? undefined : true,
                      page: 0,
                    })
                  }
                  className="h-4 w-4 rounded border-neutral-300 accent-primary-500"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 기타 조건 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-800">{t("filter.other")}</p>
        <div className="space-y-3">
          {/* Health check */}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              value.healthCheckRequired
                ? "bg-primary-500/8 text-primary-500"
                : "hover:bg-neutral-50"
            )}
          >
            <input
              type="checkbox"
              checked={value.healthCheckRequired === true}
              onChange={() =>
                onChange({
                  ...value,
                  healthCheckRequired: value.healthCheckRequired ? undefined : true,
                  page: 0,
                })
              }
              className="h-4 w-4 rounded border-neutral-300 accent-primary-500"
            />
            <span className="text-sm font-medium">{t("filter.healthCheck")}</span>
          </label>

          {/* Certification */}
          <div>
            <label className="block mb-1.5 text-xs text-neutral-500">{t("filter.cert")}</label>
            <input
              type="text"
              placeholder={t("filter.certPlaceholder")}
              value={value.certification ?? ""}
              onChange={(e) =>
                onChange({ ...value, certification: e.target.value || undefined, page: 0 })
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Equipment */}
          <div>
            <label className="block mb-1.5 text-xs text-neutral-500">{t("filter.equipment")}</label>
            <input
              type="text"
              placeholder={t("filter.equipmentPlaceholder")}
              value={value.equipment ?? ""}
              onChange={(e) =>
                onChange({ ...value, equipment: e.target.value || undefined, page: 0 })
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ page: 0, size: value.size })}
        className="mt-1 w-full rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
      >
        {t("jobs.resetFilter")}
      </button>
    </div>
  );
}

// ─── Count active filters ─────────────────────────────────────────────────────

export function countActiveFilters(filter: JobsFilter): number {
  let count = 0;
  if (filter.sido) count++;
  if (filter.sigungu) count++;
  if (filter.categoryId) count++;
  if (filter.payUnit) count++;
  if (filter.payMin != null) count++;
  if (filter.payMax != null) count++;
  if (filter.keyword) count++;
  if (filter.accommodationProvided) count++;
  if (filter.mealProvided) count++;
  if (filter.transportationProvided) count++;
  if (filter.applicationType) count++;
  if (filter.visaType) count++;
  if (filter.nationality) count++;
  if (filter.healthCheckRequired) count++;
  if (filter.certification) count++;
  if (filter.equipment) count++;
  if (filter.lat != null) count++;
  return count;
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function JobFiltersSidebar({
  value,
  onChange,
}: {
  value: JobsFilter;
  onChange: (f: JobsFilter) => void;
}) {
  const t = useT();
  return (
    <aside className="sticky top-[72px] w-64 flex-shrink-0 self-start rounded-lg border border-neutral-100 bg-white p-5 shadow-card">
      <p className="mb-5 text-sm font-bold text-neutral-950">{t("common.filter")}</p>
      <FilterContent value={value} onChange={onChange} />
    </aside>
  );
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────

export function JobFiltersMobile({
  value,
  onChange,
}: {
  value: JobsFilter;
  onChange: (f: JobsFilter) => void;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const activeCount = countActiveFilters(value);

  // Prevent body scroll when sheet is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg transition-all hover:bg-neutral-800 active:scale-95 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {t("common.filter")}
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning-400 text-xs font-bold text-neutral-900">
            {activeCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-card-xl transition-transform duration-300 lg:hidden",
          open ? "translate-y-0 animate-slide-up" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200" />
        <FilterContent
          value={value}
          onChange={(f) => {
            onChange(f);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </div>
    </>
  );
}
