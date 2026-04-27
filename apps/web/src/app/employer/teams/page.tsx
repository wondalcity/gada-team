"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, MapPin, Globe, ChevronRight, Search, SlidersHorizontal,
  X, ChevronDown, Coins, Send, CheckCircle2, AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, type TeamListItem, type TeamsFilter } from "@/lib/teams-api";
import { employerApi } from "@/lib/employer-api";
import { useAuthStore } from "@/store/authStore";
import { useCategories } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";

const SIDO_OPTIONS = [
  "전체", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];
const PAGE_SIZE = 20;

// ─── Region dropdown ──────────────────────────────────────────────────────────

function RegionDropdown({ value, allLabel, onChange }: {
  value: string; allLabel: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const isSelected = value !== allLabel;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
          isSelected ? "border-primary-300 bg-primary-50 text-primary-700" : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300",
          open && "border-primary-400 ring-2 ring-primary-100")}>
        <div className="flex items-center gap-2">
          <MapPin className={cn("h-3.5 w-3.5", isSelected ? "text-primary-500" : "text-neutral-400")} />
          <span>{value}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180", isSelected ? "text-primary-400" : "text-neutral-400")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
          {SIDO_OPTIONS.map((opt, i) => {
            const val = i === 0 ? allLabel : opt;
            const active = value === val;
            return (
              <button key={opt} type="button" onClick={() => { onChange(val); setOpen(false); }}
                className={cn("flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-primary-50 font-semibold text-primary-600" : "text-neutral-700 hover:bg-neutral-50")}>
                {opt}
                {active && <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Propose modal ────────────────────────────────────────────────────────────

function ProposeModal({ team, onClose }: { team: TeamListItem; onClose: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: balance } = useQuery({ queryKey: ["pointBalance"], queryFn: employerApi.getPointBalance });
  const { data: jobs } = useQuery({
    queryKey: ["employerJobs"],
    queryFn: () => employerApi.getMyJobs(),
  });
  const [selectedJobId, setSelectedJobId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const job = jobs?.content.find(j => j.publicId === selectedJobId);
      return employerApi.sendProposal(team.publicId, selectedJobId, job?.title, message || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pointBalance"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setSuccess(true);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || t("employer.proposalInsufficientPoints"));
    },
  });

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success-500 mb-3" />
          <p className="text-base font-semibold text-neutral-900">{t("employer.proposalSent")}</p>
          <button onClick={onClose} className="mt-4 w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600">확인</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-neutral-900">{t("employer.proposalTitle")}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{team.name}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"><X className="h-4 w-4 text-neutral-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Point balance */}
          <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
            (balance?.balance ?? 0) > 0 ? "bg-primary-50 text-primary-700" : "bg-danger-50 text-danger-600")}>
            <Coins className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">잔여 포인트: {balance?.balance ?? 0}P</span>
            {(balance?.balance ?? 0) === 0 && (
              <Link href="/employer/points" className="ml-auto text-xs underline" onClick={onClose}>{t("employer.chargeNow")}</Link>
            )}
          </div>

          {/* Job select */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600">{t("employer.proposalSelectJob")}</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">{t("employer.proposalSelectJob")}</option>
              {(jobs?.content ?? []).filter(j => j.status === "PUBLISHED").map(j => (
                <option key={j.publicId} value={j.publicId}>{j.title}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600">{t("employer.proposalMessage")}</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="팀에게 전달할 메시지를 입력하세요 (선택)"
              className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            disabled={!selectedJobId || (balance?.balance ?? 0) === 0 || mutation.isPending}
            onClick={() => { setErrorMsg(""); mutation.mutate(); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {mutation.isPending ? "전송 중..." : t("employer.proposalSend")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Team row ─────────────────────────────────────────────────────────────────

function TeamRow({ team, onPropose }: { team: TeamListItem; onPropose: (t: TeamListItem) => void }) {
  const t = useT();
  const isCompany = team.teamType === "COMPANY_LINKED";
  const regionText = team.isNationwide
    ? null
    : team.regions?.slice(0, 2).map(r => r.sido.replace("특별시","").replace("광역시","").replace("특별자치시","")).join(" · ") + (team.regions?.length > 2 ? ` 외 ${team.regions.length - 2}` : "");

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">
      <Link href={`/teams/${team.publicId}`} className="flex flex-1 items-center gap-3 min-w-0">
        <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white",
          isCompany ? "bg-secondary-500" : "bg-primary-500")}>
          {team.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600">{team.name}</span>
            <span className={cn("flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
              isCompany ? "bg-secondary-100 text-secondary-600" : "bg-primary-50 text-primary-500")}>
              {isCompany ? t("teams.affiliated") : t("teams.squad")}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {team.isNationwide ? (
              <span className="inline-flex items-center gap-0.5 text-xs text-success-700"><Globe className="h-3 w-3" />{t("teams.nationwide")}</span>
            ) : regionText ? (
              <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400"><MapPin className="h-3 w-3" />{regionText}</span>
            ) : null}
            <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400"><Users className="h-3 w-3" />{team.memberCount}{t("teams.persons")}</span>
          </div>
        </div>
      </Link>
      <button onClick={() => onPropose(team)}
        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">
        <Send className="h-3.5 w-3.5" />
        제안
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployerTeamsPage() {
  const t = useT();
  const { locale } = useLocaleStore();
  const { data: balance } = useQuery({ queryKey: ["pointBalance"], queryFn: employerApi.getPointBalance });
  const { data: categories } = useCategories();

  const [filter, setFilter] = React.useState<TeamsFilter>({ page: 0, size: PAGE_SIZE });
  const [keyword, setKeyword] = React.useState("");
  const [proposeTeam, setProposeTeam] = React.useState<TeamListItem | null>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const SIDO_ALL = t("teams.filterAll");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["teams", filter],
    queryFn: ({ pageParam = 0 }) => teamsApi.getTeams({ ...filter, page: pageParam }),
    getNextPageParam: (last) => last.page < last.totalPages - 1 ? last.page + 1 : undefined,
    initialPageParam: 0,
  });

  const teams = data?.pages.flatMap(p => p.content) ?? [];
  const total = data?.pages[0]?.totalElements ?? 0;

  function handleKeywordSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilter(f => ({ ...f, keyword: keyword || undefined, page: 0 }));
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{t("employer.teamsTitle")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{t("employer.teamsDesc")}</p>
        </div>
        {/* Point balance */}
        <Link href="/employer/points"
          className={cn("flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors",
            (balance?.balance ?? 0) > 0
              ? "bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100"
              : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100")}>
          <Coins className="h-4 w-4" />
          <span>{balance?.balance ?? 0}P</span>
          {(balance?.balance ?? 0) === 0 && <span className="text-xs text-primary-500 ml-1">충전</span>}
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleKeywordSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder={t("teams.searchPlaceholder")}
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none" />
        </div>
        <button type="button" onClick={() => setFilterOpen(v => !v)}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <SlidersHorizontal className="h-4 w-4" />
          필터
        </button>
      </form>

      <div className="flex gap-5">
        {/* Sidebar filter (desktop) */}
        <aside className="hidden w-52 flex-shrink-0 lg:block">
          <div className="sticky top-20 rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
            <p className="text-sm font-bold text-neutral-900">필터</p>
            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-600">{t("teams.filterRegion")}</p>
              <RegionDropdown value={filter.sido ?? SIDO_ALL} allLabel={SIDO_ALL}
                onChange={v => setFilter(f => ({ ...f, sido: v === SIDO_ALL ? undefined : v, page: 0 }))} />
            </div>
            {categories && (
              <div>
                <p className="mb-2 text-xs font-semibold text-neutral-600">{t("teams.filterCategory")}</p>
                <div className="grid grid-cols-2 gap-1">
                  {categories.map(cat => {
                    const active = filter.categoryId === cat.id;
                    const name = locale === "en" && (cat as any).nameEn ? (cat as any).nameEn : locale === "vi" && (cat as any).nameVi ? (cat as any).nameVi : cat.nameKo;
                    return (
                      <button key={cat.id} type="button" onClick={() => setFilter(f => ({ ...f, categoryId: active ? undefined : cat.id, page: 0 }))}
                        className={cn("rounded-lg px-2 py-1.5 text-xs font-medium text-center transition-all",
                          active ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => setFilter({ page: 0, size: PAGE_SIZE })}
              className="w-full rounded-lg border border-neutral-200 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
              초기화
            </button>
          </div>
        </aside>

        {/* Team list */}
        <div className="flex-1 min-w-0">
          {/* Count */}
          <div className="mb-3 text-sm text-neutral-500">{t("teams.countLabel" as any, total)}</div>

          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-neutral-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/5 rounded bg-neutral-200" />
                    <div className="h-3 w-3/5 rounded bg-neutral-100" />
                  </div>
                </div>
              ))
            ) : teams.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto h-10 w-10 text-neutral-300 mb-3" />
                <p className="text-sm font-semibold text-neutral-600">{t("teams.empty")}</p>
                <p className="text-xs text-neutral-400 mt-1">{t("teams.emptyDesc")}</p>
              </div>
            ) : (
              teams.map(team => <TeamRow key={team.publicId} team={team} onPropose={setProposeTeam} />)
            )}
          </div>

          {hasNextPage && (
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
              className="mt-4 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
              {isFetchingNextPage ? "로딩 중..." : "더 보기"}
            </button>
          )}
        </div>
      </div>

      {/* Propose modal */}
      {proposeTeam && <ProposeModal team={proposeTeam} onClose={() => setProposeTeam(null)} />}
    </div>
  );
}
