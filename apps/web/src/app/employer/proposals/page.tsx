"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { employerApi, TeamProposalData, PagedResponse } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status badge ──────────────────────────────────────────────

function ProposalStatusBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: t("employer.proposalStatusPending"),
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
    },
    ACCEPTED: {
      label: t("employer.proposalStatusAccepted"),
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    DECLINED: {
      label: t("employer.proposalStatusDeclined"),
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
    EXPIRED: {
      label: t("employer.proposalStatusExpired"),
      cls: "bg-neutral-100 text-neutral-500 border-neutral-200",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-neutral-50 text-neutral-600 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <Send className="h-7 w-7 text-neutral-300" />
      </div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{t("employer.proposalNoMore")}</h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-6">
        {t("employer.proposalNoMoreDesc")}
      </p>
      <Link
        href="/employer/teams"
        className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
      >
        <Send className="h-4 w-4" />
        {t("employer.goToTeams")}
      </Link>
    </div>
  );
}

// ─── Proposal row ─────────────────────────────────────────────

function ProposalRow({ proposal }: { proposal: TeamProposalData }) {
  const t = useT();
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {proposal.jobTitle ?? t("employer.proposalJobFallback")}
            </span>
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
            <span>{t("employer.teamIdPrefix")}: {proposal.teamPublicId.slice(0, 8)}...</span>
            <span className="text-neutral-300">·</span>
            <span>{fmtDatetime(proposal.createdAt)}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-primary-500 font-medium">-{proposal.pointsUsed}P</span>
          </div>
          {proposal.message && (
            <div className="mt-2 flex items-start gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-neutral-300 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-neutral-500 line-clamp-2">{proposal.message}</p>
            </div>
          )}
        </div>
        {proposal.respondedAt && (
          <p className="text-xs text-neutral-400 flex-shrink-0 mt-0.5">
            {fmtDatetime(proposal.respondedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function EmployerProposalsPage() {
  const t = useT();
  const [page, setPage] = React.useState(0);

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<TeamProposalData>>({
    queryKey: ["employer", "proposals", page],
    queryFn: () => employerApi.listProposals(page, PAGE_SIZE),
  });

  const proposals = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // Stats
  const accepted = proposals.filter((p) => p.status === "ACCEPTED").length;
  const pending = proposals.filter((p) => p.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/employer/points"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("employer.proposalsBack")}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">{t("employer.proposalHistory")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("employer.proposalDesc")}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("employer.refresh")}
        </button>
      </div>

      {/* Stats row */}
      {!isLoading && proposals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-neutral-500 mb-1">{t("employer.proposalAllLabel")}</p>
            <p className="text-2xl font-bold text-neutral-900">{totalElements}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-neutral-500 mb-1">{t("employer.proposalAccepted")}</p>
            <p className="text-2xl font-bold text-green-700">{accepted}</p>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-neutral-500 mb-1">{t("employer.proposalPending")}</p>
            <p className="text-2xl font-bold text-yellow-700">{pending}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{t("employer.loadFailed")}</span>
          <button onClick={() => refetch()} className="ml-auto underline text-red-600">{t("employer.retry")}</button>
        </div>
      )}

      {/* List card */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-40 rounded bg-neutral-100" />
                  <div className="h-5 w-16 rounded-full bg-neutral-100" />
                </div>
                <div className="h-3 w-56 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-neutral-100">
            {proposals.map((proposal) => (
              <ProposalRow key={proposal.publicId} proposal={proposal} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("employer.prev")}
            </button>
            <span className="text-xs text-neutral-500">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("employer.next")}
            </button>
          </div>
        )}
      </div>

      {/* Go to teams */}
      <Link
        href="/employer/teams"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 hover:bg-neutral-50 transition-colors shadow-sm group"
      >
        <div>
          <p className="text-sm font-semibold text-neutral-800">{t("employer.teamsTitle")}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{t("employer.toTeamsDesc")}</p>
        </div>
        <Send className="h-4 w-4 text-neutral-400 group-hover:text-primary-500 transition-colors" />
      </Link>
    </div>
  );
}
