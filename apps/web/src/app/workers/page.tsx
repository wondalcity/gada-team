"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MessageCircle,
  UserPlus,
  Coins,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkers, WorkerListItem } from "@/lib/workers-api";
import { directChatApi, workerPointsApi, TlPointBalanceResponse } from "@/lib/chat-api";
import { teamsApi, TeamResponse } from "@/lib/teams-api";
import { useAuthStore } from "@/store/authStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { useT } from "@/lib/i18n";

// ─── Team Proposal Modal ──────────────────────────────────────

function ProposeModal({
  worker,
  onClose,
  onSuccess,
}: {
  worker: WorkerListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data: teams, isLoading: teamsLoading } = useQuery<TeamResponse[]>({
    queryKey: ["led-teams"],
    queryFn: () => teamsApi.getLeadedTeams(),
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (!selectedTeamId) throw new Error(t("workers.selectTeam"));
      return teamsApi.inviteMemberByProfile(selectedTeamId, worker.publicId);
    },
    onSuccess: () => {
      setToast(t("workers.inviteSent", worker.fullName));
      queryClient.invalidateQueries({ queryKey: ["tl-point-balance"] });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    },
    onError: (err: any) => {
      setError(err?.message ?? t("workers.proposeFail"));
      setTimeout(() => setError(null), 5000);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">{t("workers.inviteModalTitle")}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{worker.fullName} · {t("nav.pointsSection")} -1P</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Team list */}
        <div className="px-5 py-4 max-h-60 overflow-y-auto">
          {teamsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : !teams?.length ? (
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-400">{t("workers.noTeams")}</p>
              <Link
                href="/teams/create"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
              >
                {t("workers.createTeam")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.publicId}
                  onClick={() => setSelectedTeamId(team.publicId)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all",
                    selectedTeamId === team.publicId
                      ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                      : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      selectedTeamId === team.publicId
                        ? "bg-primary-500 text-white"
                        : "bg-neutral-100 text-neutral-700"
                    )}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        selectedTeamId === team.publicId ? "text-primary-700" : "text-neutral-800"
                      )}
                    >
                      {team.name}
                    </p>
                    <p className="text-xs text-neutral-500">{team.memberCount}{t("teams.persons")}</p>
                  </div>
                  {selectedTeamId === team.publicId && (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toasts */}
        {toast && (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {toast}
          </div>
        )}
        {error && (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={!selectedTeamId || inviteMutation.isPending}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
              selectedTeamId && !inviteMutation.isPending
                ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
          >
            {inviteMutation.isPending ? t("workers.processing") : t("workers.inviteSend")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Worker Card ──────────────────────────────────────────────

function WorkerCard({
  worker,
  isLeader,
  onChat,
  onPropose,
}: {
  worker: WorkerListItem;
  isLeader: boolean;
  onChat: () => void;
  onPropose: () => void;
}) {
  const t = useT();

  function nationalityLabel(code: string): string {
    const map: Record<string, string> = {
      VN: t("nationality.VN"),
      KH: t("nationality.KH"),
      ID: t("nationality.ID"),
      TH: t("nationality.TH"),
      PH: t("nationality.PH"),
      MM: t("nationality.MM"),
      NP: t("nationality.NP"),
      SL: t("nationality.SL"),
      KR: t("nationality.KR"),
    };
    return map[code] ?? code;
  }

  function visaLabel(code: string): string {
    const map: Record<string, string> = {
      E9: t("visa.E9"),
      H2: t("visa.H2"),
      E7: t("visa.E7"),
      F4: t("visa.F4"),
      F5: t("visa.F5"),
      E10: t("visa.E10"),
      OTHER: t("visa.OTHER"),
    };
    return map[code] ?? code;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={worker.profileImageUrl || `/images/worker-placeholder-${(worker.publicId.charCodeAt(0) % 5) + 1}.svg`}
            alt={worker.fullName}
            className="h-12 w-12 rounded-xl object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/workers/${worker.publicId}`}
              className="text-sm font-semibold text-neutral-900 hover:text-primary-600 transition-colors"
            >
              {worker.fullName}
            </Link>
            {worker.isTeamLeader && (
              <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 border border-primary-200">
                {t("teams.leaderBadge")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-xs text-neutral-500">{nationalityLabel(worker.nationality)}</span>
            <span className="text-neutral-300 text-xs">·</span>
            <span className="text-xs text-neutral-500">{visaLabel(worker.visaType)}</span>
            {worker.teamName && (
              <>
                <span className="text-neutral-300 text-xs">·</span>
                <span className="text-xs text-neutral-500 truncate max-w-[120px]">{worker.teamName}</span>
              </>
            )}
          </div>
          {(worker.desiredPayMin || worker.desiredPayMax) && (
            <p className="text-xs text-primary-600 font-medium mt-1">
              {worker.desiredPayMin?.toLocaleString() ?? "?"} ~{" "}
              {worker.desiredPayMax?.toLocaleString() ?? "?"}{" "}
              {worker.desiredPayUnit === "DAILY" ? t("workers.payPerDay") : worker.desiredPayUnit === "MONTHLY" ? t("workers.payPerMonth") : t("workers.payPerHour")}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons — only for TEAM_LEADER */}
      {isLeader && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onChat}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("workers.chatBtn")} <span className="text-[10px] font-normal text-neutral-400">(1P)</span>
          </button>
          <button
            onClick={onPropose}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-2 text-xs font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("workers.inviteBtn")} <span className="text-[10px] font-normal text-primary-200">(1P)</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────

function WorkerCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-neutral-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-neutral-100" />
          <div className="h-3 w-40 rounded bg-neutral-100" />
          <div className="h-3 w-28 rounded bg-neutral-100" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex-1 h-8 rounded-xl bg-neutral-100" />
        <div className="flex-1 h-8 rounded-xl bg-neutral-100" />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function WorkersPage() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isLeader = user?.role === "TEAM_LEADER";

  const [keyword, setKeyword] = React.useState("");
  const [debouncedKeyword, setDebouncedKeyword] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [proposeTarget, setProposeTarget] = React.useState<WorkerListItem | null>(null);
  const [chatError, setChatError] = React.useState<string | null>(null);

  // Debounce keyword
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Workers query
  const { data, isLoading } = useQuery({
    queryKey: ["workers-search", debouncedKeyword, page],
    queryFn: () => getWorkers({ keyword: debouncedKeyword || undefined, page, size: PAGE_SIZE }),
  });

  // Point balance (only for team leaders)
  const { data: balance } = useQuery<TlPointBalanceResponse>({
    queryKey: ["tl-point-balance"],
    queryFn: () => workerPointsApi.getBalance(),
    enabled: isLeader,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (workerPublicId: string) => directChatApi.openRoom(workerPublicId),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["tl-point-balance"] });
      router.push(`/chats/direct/${room.publicId}`);
    },
    onError: (err: any) => {
      setChatError(err?.message ?? t("workers.chatStart"));
      setTimeout(() => setChatError(null), 5000);
    },
  });

  const workers = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">{t("workers.title")}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {t("workers.subtitle")}
            </p>
          </div>
          {isLeader && (
            <Link
              href="/leader/points"
              className="flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
            >
              <Coins className="h-4 w-4" />
              {balance !== undefined ? `${balance.balance}P` : "—"}
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("workers.searchPlaceholder")}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
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

        {/* Point usage hint for team leaders */}
        {isLeader && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <Coins className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              {t("workers.pointHint")}{" "}
              <Link href="/leader/points" className="font-semibold underline">
                {t("workers.chargeLink")}
              </Link>
            </span>
          </div>
        )}

        {/* Chat error */}
        {chatError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {chatError}
          </div>
        )}

        {/* Worker list */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <WorkerCardSkeleton key={i} />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <Search className="h-7 w-7 text-neutral-300" />
            </div>
            <h3 className="text-base font-semibold text-neutral-700">
              {debouncedKeyword ? `"${debouncedKeyword}" ${t("workers.noResults")}` : t("workers.noWorkers")}
            </h3>
            {debouncedKeyword && (
              <button
                onClick={() => setKeyword("")}
                className="mt-3 text-sm text-primary-600 hover:underline"
              >
                {t("workers.resetSearch")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workers.map((worker) => (
                <WorkerCard
                  key={worker.publicId}
                  worker={worker}
                  isLeader={isLeader}
                  onChat={() => chatMutation.mutate(worker.publicId)}
                  onPropose={() => setProposeTarget(worker)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("common.prev")}
                </button>
                <span className="text-xs text-neutral-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("common.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Propose modal */}
      {proposeTarget && (
        <ProposeModal
          worker={proposeTarget}
          onClose={() => setProposeTarget(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tl-point-balance"] })}
        />
      )}
    </AppLayout>
  );
}
