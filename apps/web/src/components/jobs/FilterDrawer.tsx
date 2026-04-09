"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationPicker } from "./LocationPicker";
import type { JobsFilter, CategoryItem } from "@/lib/jobs-api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDO_OPTIONS = [
  "전체", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const PAY_UNIT_OPTIONS = [
  { value: "HOURLY", label: "시급" },
  { value: "DAILY", label: "일급" },
  { value: "WEEKLY", label: "주급" },
  { value: "MONTHLY", label: "월급" },
  { value: "LUMP_SUM", label: "일시불" },
];

const APPLICATION_TYPE_OPTIONS = [
  { value: "INDIVIDUAL", label: "개인 지원", icon: "👤" },
  { value: "TEAM", label: "팀 지원", icon: "👥" },
  { value: "COMPANY", label: "기업 채용", icon: "🏢" },
];

const VISA_TYPE_OPTIONS = [
  { value: "CITIZEN", label: "내국인" },
  { value: "H2", label: "방문취업 H-2" },
  { value: "E9", label: "비전문 E-9" },
  { value: "E7", label: "특정활동 E-7" },
  { value: "F4", label: "재외동포 F-4" },
  { value: "F5", label: "영주 F-5" },
  { value: "F6", label: "결혼이민 F-6" },
  { value: "OTHER", label: "기타" },
];

// ─── Count active filters ─────────────────────────────────────────────────────

function countDrawerFilters(f: JobsFilter): number {
  let n = 0;
  if (f.sido) n++;
  if (f.sigungu) n++;
  if (f.categoryId) n++;
  if (f.payUnit) n++;
  if (f.payMin != null) n++;
  if (f.payMax != null) n++;
  if (f.applicationType) n++;
  if (f.visaType) n++;
  if (f.nationality) n++;
  if (f.healthCheckRequired) n++;
  if (f.certification) n++;
  if (f.equipment) n++;
  if (f.accommodationProvided) n++;
  if (f.mealProvided) n++;
  if (f.transportationProvided) n++;
  if (f.lat != null) n++;
  return n;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-neutral-100 pt-5">
      <p className="mb-3 text-sm font-semibold text-neutral-800">{title}</p>
      {children}
    </div>
  );
}

// ─── FilterDrawer ─────────────────────────────────────────────────────────────

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filter: JobsFilter;
  onApply: (newFilter: JobsFilter) => void;
  categories: CategoryItem[];
}

export function FilterDrawer({
  isOpen,
  onClose,
  filter,
  onApply,
  categories,
}: FilterDrawerProps) {
  // Local copy — changes are staged until "적용" is tapped
  const [local, setLocal] = useState<JobsFilter>(filter);

  // Sync local state when the drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocal(filter);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function handleApply() {
    onApply({ ...local, page: 0 });
    onClose();
  }

  function handleReset() {
    setLocal({ page: 0, size: filter.size });
  }

  const activeCount = countDrawerFilters(local);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-neutral-100">
          <span className="text-base font-semibold text-neutral-950">필터 설정</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
              aria-label="닫기"
            >
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {/* 현재 위치 */}
          <Section title="현재 위치">
            <LocationPicker
              lat={local.lat}
              lng={local.lng}
              radius={local.radius ?? 10}
              onLocationChange={(lat, lng) =>
                setLocal((prev) => ({ ...prev, lat, lng, radius: prev.radius ?? 10 }))
              }
              onRadiusChange={(radius) =>
                setLocal((prev) => ({ ...prev, radius }))
              }
              onClear={() =>
                setLocal((prev) => ({ ...prev, lat: undefined, lng: undefined, radius: undefined }))
              }
            />
          </Section>

          {/* 지역 선택 */}
          <Section title="지역 선택">
            <div className="relative mb-3">
              <select
                value={local.sido ?? "전체"}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocal((prev) => ({
                    ...prev,
                    sido: v === "전체" ? undefined : v,
                    sigungu: undefined,
                  }));
                }}
                className="w-full appearance-none rounded-lg border border-neutral-200 bg-white px-4 py-2.5 pr-9 text-sm font-medium text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {SIDO_OPTIONS.map((sido) => (
                  <option key={sido} value={sido}>
                    {sido}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="시/군/구 (선택)"
              value={local.sigungu ?? ""}
              onChange={(e) =>
                setLocal((prev) => ({ ...prev, sigungu: e.target.value || undefined }))
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </Section>

          {/* 직종 */}
          <Section title="직종">
            {categories.length === 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const active = local.categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setLocal((prev) => ({
                          ...prev,
                          categoryId: active ? undefined : cat.id,
                        }))
                      }
                      className={cn(
                        "rounded-lg px-2 py-2 text-xs font-medium text-center transition-all",
                        active
                          ? "bg-primary-500 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      )}
                    >
                      {cat.nameKo}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 지원 방식 */}
          <Section title="지원 방식">
            <div className="grid grid-cols-3 gap-2">
              {APPLICATION_TYPE_OPTIONS.map((opt) => {
                const active = local.applicationType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setLocal((prev) => ({
                        ...prev,
                        applicationType: active ? undefined : opt.value,
                      }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-xs font-medium transition-all",
                      active
                        ? "border-primary-500 bg-primary-50 text-primary-500"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    )}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 급여 조건 */}
          <Section title="급여 조건">
            {/* Pay unit chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PAY_UNIT_OPTIONS.map((opt) => {
                const active = local.payUnit === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setLocal((prev) => ({
                        ...prev,
                        payUnit: active ? undefined : opt.value,
                      }))
                    }
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
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

            {/* Min / Max pay */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="최소 급여"
                  value={local.payMin ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      payMin: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">원</span>
              </div>
              <span className="text-neutral-400 font-medium">~</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="최대 급여"
                  value={local.payMax ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      payMax: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">원</span>
              </div>
            </div>
          </Section>

          {/* 비자 조건 */}
          <Section title="비자 조건">
            <div className="flex flex-wrap gap-2">
              {VISA_TYPE_OPTIONS.map((opt) => {
                const active = local.visaType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setLocal((prev) => ({
                        ...prev,
                        visaType: active ? undefined : opt.value,
                      }))
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
          </Section>

          {/* 복지 */}
          <Section title="복지">
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { key: "accommodationProvided" as const, label: "숙소 제공" },
                  { key: "mealProvided" as const, label: "식사 제공" },
                  { key: "transportationProvided" as const, label: "교통비 지원" },
                ]
              ).map(({ key, label }) => {
                const checked = local[key] === true;
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      checked ? "bg-primary-500/8 text-primary-500" : "hover:bg-neutral-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setLocal((prev) => ({ ...prev, [key]: checked ? undefined : true }))
                      }
                      className="h-4 w-4 rounded border-neutral-300 accent-primary-500"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          {/* 기타 조건 */}
          <Section title="기타 조건">
            <div className="space-y-3">
              {/* Health check toggle */}
              <label className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                local.healthCheckRequired ? "bg-primary-500/8 text-primary-500" : "hover:bg-neutral-50"
              )}>
                <input
                  type="checkbox"
                  checked={local.healthCheckRequired === true}
                  onChange={() =>
                    setLocal((prev) => ({
                      ...prev,
                      healthCheckRequired: prev.healthCheckRequired ? undefined : true,
                    }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 accent-primary-500"
                />
                <span className="text-sm font-medium">건강검진 필요</span>
              </label>

              {/* Certification */}
              <div>
                <label className="block mb-1.5 text-xs text-neutral-500">자격증</label>
                <input
                  type="text"
                  placeholder="예: 지게차운전기능사"
                  value={local.certification ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, certification: e.target.value || undefined }))
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Equipment */}
              <div>
                <label className="block mb-1.5 text-xs text-neutral-500">보유 장비</label>
                <input
                  type="text"
                  placeholder="예: 덤프트럭, 굴삭기"
                  value={local.equipment ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, equipment: e.target.value || undefined }))
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>
          </Section>

          {/* Bottom padding so footer doesn't overlap last section */}
          <div className="h-2" />
        </div>

        {/* Fixed footer */}
        <div className="flex-shrink-0 border-t border-neutral-100 bg-white px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[2] rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {activeCount > 0
              ? `필터 ${activeCount}개 적용하기`
              : "적용하기"}
          </button>
        </div>
      </div>
    </>
  );
}
