"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Inbox,
  Briefcase,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ChevronRight,
} from "lucide-react";
import {
  workerTeamProposalApi,
  memberProposalApi,
  WorkerTeamProposalItem,
  MemberProposalItem,
} from "@/lib/chat-api";
import { teamsApi, InvitationResponse, SentInvitationResponse } from "@/lib/teams-api";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, string> = {
    PENDING:  "bg-warning-50 text-warning-700 border border-warning-200",
    ACCEPTED: "bg-success-50 text-success-700 border border-success-200",
    DECLINED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
    EXPIRED:  "bg-neutral-100 text-neutral-400 border border-neutral-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        map[status] ?? "bg-neutral-100 text-neutral-500"
      )}
    >
      {status === "PENDING" && <Clock className="h-3 w-3" />}
      {status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
      {(status === "DECLINED" || status === "EXPIRED") && (
        <XCircle className="h-3 w-3" />
      )}
      {(t as any)(`proposals.status.${status}`) || status}
    </span>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function JobProposalCard({ proposal }: { proposal: WorkerTeamProposalItem }) {
  const t = useT();
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: (status: "ACCEPTED" | "DECLINED") =>
      workerTeamProposalApi.respond(proposal.publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-team-proposals"] });
    },
  });

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
            <Briefcase className="h-5 w-5 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {proposal.jobTitle ?? t("proposals.defaultJobTitle")}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      {proposal.message && (
        <p className="mt-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600 leading-relaxed">
          {proposal.message}
        </p>
      )}

      <div className="mt-3">
        <Link
          href={`/jobs/${proposal.jobPublicId}`}
          className="text-xs font-medium text-primary-500 hover:underline"
        >
          {t("proposals.viewJob")}
        </Link>
      </div>

      {proposal.status === "PENDING" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => respondMutation.mutate("ACCEPTED")}
            disabled={respondMutation.isPending}
            className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
          >
            {t("proposals.accept")}
          </button>
          <button
            onClick={() => respondMutation.mutate("DECLINED")}
            disabled={respondMutation.isPending}
            className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
          >
            {t("proposals.decline")}
          </button>
        </div>
      )}
    </div>
  );
}

function MemberProposalCard({ proposal }: { proposal: MemberProposalItem }) {
  const t = useT();
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: (status: "ACCEPTED" | "DECLINED") =>
      memberProposalApi.respondToProposal(proposal.publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["received-member-proposals"] });
    },
  });

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-success-50">
            <UserPlus className="h-5 w-5 text-success-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {proposal.proposerName ?? "근로자"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {t("proposals.memberProposalType")} · {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      {proposal.message && (
        <p className="mt-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600 leading-relaxed">
          {proposal.message}
        </p>
      )}

      {/* 프로필 보기 링크 */}
      {proposal.proposerPublicId && (
        <div className="mt-3">
          <Link
            href={`/workers/${proposal.proposerPublicId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:underline"
          >
            프로필 상세 보기
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {proposal.status === "PENDING" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => respondMutation.mutate("ACCEPTED")}
            disabled={respondMutation.isPending}
            className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
          >
            {t("proposals.accept")}
          </button>
          <button
            onClick={() => respondMutation.mutate("DECLINED")}
            disabled={respondMutation.isPending}
            className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
          >
            {t("proposals.decline")}
          </button>
        </div>
      )}
    </div>
  );
}

// 팀장이 보낸 초대 카드
function SentInvitationCard({ invitation }: { invitation: SentInvitationResponse }) {
  const t = useT();

  const statusCls: Record<string, string> = {
    PENDING:  "bg-warning-50 text-warning-700 border border-warning-200",
    ACCEPTED: "bg-success-50 text-success-700 border border-success-200",
    DECLINED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
    EXPIRED:  "bg-neutral-100 text-neutral-400 border border-neutral-200",
  };

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img
              src={invitation.inviteeProfileImageUrl || `/images/worker-placeholder-${(invitation.invitationId % 5) + 1}.svg`}
              alt={invitation.inviteeName ?? ""}
              className="h-10 w-10 rounded-xl object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {invitation.inviteeName ?? t("proposals.unknownWorker")}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {invitation.teamName} · {invitation.invitedAt ? formatDate(invitation.invitedAt) : ""}
            </p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusCls[invitation.status] ?? "bg-neutral-100 text-neutral-500")}>
          {invitation.status === "PENDING" && <Clock className="h-3 w-3" />}
          {invitation.status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
          {(invitation.status === "DECLINED" || invitation.status === "EXPIRED") && <XCircle className="h-3 w-3" />}
          {(t as any)(`proposals.status.${invitation.status}`) || invitation.status}
        </span>
      </div>
      {invitation.inviteePublicId && (
        <div className="mt-3">
          <Link
            href={`/workers/${invitation.inviteePublicId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:underline"
          >
            {t("proposals.viewProfile")}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function TeamInvitationCard({ invitation }: { invitation: InvitationResponse }) {
  const t = useT();
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: (action: "accept" | "reject") =>
      action === "accept"
        ? teamsApi.acceptInvitation(invitation.invitationId)
        : teamsApi.rejectInvitation(invitation.invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-invitations"] });
    },
  });

  const isPending = invitation.status === "PENDING";

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {invitation.teamCoverImageUrl ? (
              <img
                src={invitation.teamCoverImageUrl}
                alt={invitation.teamName}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-lg font-extrabold text-white">
                {invitation.teamName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {invitation.teamName}
            </p>
            {invitation.invitedByName && (
              <p className="mt-0.5 text-xs text-neutral-400">
                {invitation.invitedByName}{t("invite.invited")}
              </p>
            )}
          </div>
        </div>
        {!isPending && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              invitation.status === "ACCEPTED"
                ? "bg-success-50 text-success-700 border border-success-200"
                : "bg-neutral-100 text-neutral-500 border border-neutral-200"
            )}
          >
            {invitation.status === "ACCEPTED" ? (
              <><CheckCircle2 className="h-3 w-3" />{t("invite.accepted")}</>
            ) : (
              <><XCircle className="h-3 w-3" />{t("invite.rejected")}</>
            )}
          </span>
        )}
      </div>

      {isPending && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => respondMutation.mutate("accept")}
            disabled={respondMutation.isPending}
            className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
          >
            {t("invite.accept")}
          </button>
          <button
            onClick={() => respondMutation.mutate("reject")}
            disabled={respondMutation.isPending}
            className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
          >
            {t("invite.reject")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-100" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-neutral-100 bg-white py-16 text-center">
      <Inbox className="mb-3 h-9 w-9 text-neutral-200" />
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  pendingCount: number;
  totalCount: number;
}

function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-white border-b border-neutral-200 px-4 sm:-mx-6 sm:px-6">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-600"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{tab.label}</span>

              {/* Pending badge */}
              {tab.pendingCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white leading-none">
                  {tab.pendingCount > 99 ? "99+" : tab.pendingCount}
                </span>
              )}

              {/* Total count when no pending */}
              {tab.pendingCount === 0 && tab.totalCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[10px] font-semibold text-neutral-500 leading-none">
                  {tab.totalCount > 99 ? "99+" : tab.totalCount}
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("job");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isLeader = mounted && user?.role === "TEAM_LEADER";
  const isWorker = mounted && (user?.role === "WORKER" || user?.role === "TEAM_LEADER");

  const jobProposalsQuery = useQuery({
    queryKey: ["worker-team-proposals"],
    queryFn: () => workerTeamProposalApi.listReceived(0, 50),
    enabled: isWorker,
    retry: false,
  });

  const memberProposalsQuery = useQuery({
    queryKey: ["received-member-proposals"],
    queryFn: () => memberProposalApi.receivedProposals(0, 50),
    enabled: isLeader,
  });

  const sentInvitationsQuery = useQuery({
    queryKey: ["sent-invitations"],
    queryFn: () => teamsApi.getSentInvitations(),
    enabled: isLeader,
    initialData: [],
  });

  const invitationsQuery = useQuery({
    queryKey: ["worker-invitations"],
    queryFn: () => teamsApi.getMyInvitations(),
    enabled: isWorker && !isLeader,
    initialData: [],
  });

  const jobProposals = jobProposalsQuery.data?.content ?? [];
  const memberProposals = memberProposalsQuery.data?.content ?? [];
  const sentInvitations = sentInvitationsQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  const jobPending = jobProposals.filter((p) => p.status === "PENDING").length;
  const memberPending = memberProposals.filter((p) => p.status === "PENDING").length;
  const sentPending = sentInvitations.filter((i) => i.status === "PENDING").length;
  const invitePending = invitations.filter((i) => i.status === "PENDING").length;

  // Build tab list depending on role
  const tabs: Tab[] = React.useMemo(() => {
    if (!mounted) return [];
    const list: Tab[] = [
      {
        id: "job",
        label: t("proposals.jobTitle"),
        icon: Briefcase,
        pendingCount: jobPending,
        totalCount: jobProposals.length,
      },
    ];
    if (isLeader) {
      list.push({
        id: "sent",
        label: t("proposals.sentInviteTitle"),
        icon: UserPlus,
        pendingCount: sentPending,
        totalCount: sentInvitations.length,
      });
      list.push({
        id: "member",
        label: t("proposals.memberTitle"),
        icon: Users,
        pendingCount: memberPending,
        totalCount: memberProposals.length,
      });
    } else if (isWorker) {
      list.push({
        id: "invite",
        label: t("proposals.inviteTitle"),
        icon: Users,
        pendingCount: invitePending,
        totalCount: invitations.length,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isLeader, isWorker, jobPending, jobProposals.length, sentPending, sentInvitations.length, memberPending, memberProposals.length, invitePending, invitations.length]);

  // Auto-switch to first tab with pending if current tab has none (only once on load)
  const autoSwitched = React.useRef(false);
  React.useEffect(() => {
    if (autoSwitched.current || tabs.length === 0) return;
    if (!jobProposalsQuery.isLoading && !memberProposalsQuery.isLoading && !invitationsQuery.isLoading) {
      const firstWithPending = tabs.find((tab) => tab.pendingCount > 0);
      if (firstWithPending && firstWithPending.id !== activeTab) {
        setActiveTab(firstWithPending.id);
      }
      autoSwitched.current = true;
    }
  }, [tabs, jobProposalsQuery.isLoading, memberProposalsQuery.isLoading, invitationsQuery.isLoading]);

  // Skeleton while not mounted
  if (!mounted) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-4">
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-56 animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="h-12 animate-pulse rounded bg-neutral-100" />
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* Page header */}
        <div className="py-6 pb-4">
          <h1 className="text-xl font-extrabold text-neutral-950">
            {t("proposals.title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("proposals.sub")}</p>
        </div>

        {/* Tab bar */}
        {tabs.length > 0 && (
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        )}

        {/* Tab content */}
        <div className="py-5 space-y-3">

          {/* ── 채용 제안 탭 ── */}
          {activeTab === "job" && (
            <>
              {jobProposalsQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                : jobProposals.length === 0
                ? <EmptyState message={t("proposals.jobEmpty")} />
                : jobProposals.map((p) => (
                    <JobProposalCard key={p.publicId} proposal={p} />
                  ))
              }
            </>
          )}

          {/* ── 내가 보낸 초대 탭 (TEAM_LEADER) ── */}
          {activeTab === "sent" && isLeader && (
            <>
              {sentInvitationsQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                : sentInvitations.length === 0
                ? <EmptyState message={t("proposals.sentInviteEmpty")} />
                : sentInvitations.map((inv) => (
                    <SentInvitationCard key={inv.invitationId} invitation={inv} />
                  ))
              }
            </>
          )}

          {/* ── 팀원 참여 요청 탭 (TEAM_LEADER) ── */}
          {activeTab === "member" && isLeader && (
            <>
              {memberProposalsQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                : memberProposals.length === 0
                ? <EmptyState message={t("proposals.memberEmpty")} />
                : memberProposals.map((p) => (
                    <MemberProposalCard key={p.publicId} proposal={p} />
                  ))
              }
            </>
          )}

          {/* ── 팀 초대 탭 (WORKER) ── */}
          {activeTab === "invite" && isWorker && !isLeader && (
            <>
              {invitationsQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                : invitations.length === 0
                ? <EmptyState message={t("proposals.inviteEmpty")} />
                : invitations.map((inv) => (
                    <TeamInvitationCard key={inv.invitationId} invitation={inv} />
                  ))
              }
            </>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
