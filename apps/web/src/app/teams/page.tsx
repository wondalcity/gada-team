"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Users, MapPin, Globe, ChevronRight, Plus, Search,
  SlidersHorizontal, X, ChevronDown, Building2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, type TeamListItem, type TeamsFilter } from "@/lib/teams-api";
import { useAuthStore } from "@/store/authStore";
import { useCategories } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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

function TeamRow({ team }: { team: TeamListItem }) {
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
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col gap-5">
      {/* Mobile header */}
      {onClose && (
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-neutral-950">필터</span>
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
        <p className="mb-2 text-sm font-semibold text-neutral-800">지역</p>
        <div className="relative">
          <select
            value={value.sido ?? "전체"}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, sido: v === "전체" ? undefined : v, page: 0 });
            }}
            className="w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-neutral-800 focus:border-primary-500 focus:outline-none"
          >
            {SIDO_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      {/* 팀 유형 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">팀 유형</p>
        <div className="flex flex-col gap-1">
          {[
            { value: "", label: "전체" },
            { value: "SQUAD", label: "스쿼드" },
            { value: "COMPANY_LINKED", label: "기업 소속" },
          ].map((opt) => {
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
            <span className="text-sm font-medium">전국 모집 팀만 보기</span>
          </div>
        </label>
      </div>

      {/* 직종 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-800">직종</p>
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
                  {cat.nameKo}
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
        필터 초기화
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
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 flex-shrink-0">
          <span className="text-base font-semibold text-neutral-950">필터 설정</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocal({ page: 0, size: PAGE_SIZE })}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              초기화
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <FilterContent value={local} onChange={setLocal} />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-neutral-100 bg-white px-5 py-4 flex gap-3">
          <button
            onClick={() => { setLocal({ page: 0, size: PAGE_SIZE }); }}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            초기화
          </button>
          <button
            onClick={() => { onApply({ ...local, page: 0 }); onClose(); }}
            className="flex-[2] rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {activeCount > 0 ? `필터 ${activeCount}개 적용` : "적용"}
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
  categories?: { id: number; nameKo: string }[];
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filter.sido) {
    chips.push({ label: filter.sido, onRemove: () => onChange({ ...filter, sido: undefined, page: 0 }) });
  }
  if (filter.teamType) {
    const label = filter.teamType === "SQUAD" ? "스쿼드" : "기업 소속";
    chips.push({ label, onRemove: () => onChange({ ...filter, teamType: undefined, page: 0 }) });
  }
  if (filter.isNationwide) {
    chips.push({ label: "전국 모집", onRemove: () => onChange({ ...filter, isNationwide: undefined, page: 0 }) });
  }
  if (filter.categoryId && categories) {
    const cat = categories.find((c) => c.id === filter.categoryId);
    if (cat) {
      chips.push({ label: cat.nameKo, onRemove: () => onChange({ ...filter, categoryId: undefined, page: 0 }) });
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
        전체 초기화
      </button>
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
          placeholder="팀 이름, 소개 검색"
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
          <p className="mb-4 text-sm font-bold text-neutral-950">필터</p>
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
              필터
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
                    필터 초기화
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
              teams.map((team) => <TeamRow key={team.publicId} team={team} />)
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
                    불러오는 중...
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  return (
    <AppLayout>
      <TeamsPageContent />
    </AppLayout>
  );
}
