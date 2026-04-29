"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, Briefcase, UserPlus, CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { workerTeamProposalApi, memberProposalApi, WorkerTeamProposalItem, MemberProposalItem } from "@/lib/chat-api";
import { teamsApi, InvitationResponse } from "@/lib/teams-api";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", map[status] ?? "bg-neutral-100 text-neutral-500")}>
      {status === "PENDING" && <Clock className="h-3 w-3" />}
      {status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
      {(status === "DECLINED" || status === "EXPIRED") && <XCircle className="h-3 w-3" />}
      {t(`proposals.status.${status}` as any) || status}
    </span>
  );
}

// ─── Employer Job Proposal Card ───────────────────────────────────────────────

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
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
            <Briefcase className="h-5 w-5 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {proposal.jobTitle ?? t("proposals.defaultJobTitle")}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">{formatDate(proposal.createdAt)}</p>
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

// ─── Member Proposal Card ─────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card">
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

// ─── Team Invitation Card ─────────────────────────────────────────────────────

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

  function getInitials(name?: string) {
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-card">
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
                {getInitials(invitation.teamName)}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{invitation.teamName}</p>
            {invitation.invitedByName && (
              <p className="mt-0.5 text-xs text-neutral-400">
                {invitation.invitedByName}{t("invite.invited")}
              </p>
            )}
          </div>
        </div>
        {!isPending && (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            invitation.status === "ACCEPTED"
              ? "bg-success-50 text-success-700 border border-success-200"
              : "bg-neutral-100 text-neutral-500 border border-neutral-200"
          )}>
            {invitation.status === "ACCEPTED"
              ? <><CheckCircle2 className="h-3 w-3" />{t("invite.accepted")}</>
              : <><XCircle className="h-3 w-3" />{t("invite.rejected")}</>
            }
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
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children, isEmpty, emptyMessage }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center rounded-xl border border-neutral-100 bg-white py-12 text-center">
          <Inbox className="mb-3 h-8 w-8 text-neutral-200" />
          <p className="text-sm text-neutral-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Gate on mounted to avoid SSR/hydration mismatch: server always renders
  // the skeleton, auth-based content is added only after client mount.
  const isLeader = mounted && user?.role === "TEAM_LEADER";
  // Workers with WORKER role can also lead teams, so query proposals for them too.
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

  const invitationsQuery = useQuery({
    queryKey: ["worker-invitations"],
    queryFn: () => teamsApi.getMyInvitations(),
    enabled: isWorker && !isLeader,
    initialData: [],
  });

  const jobProposals = jobProposalsQuery.data?.content ?? [];
  const memberProposals = memberProposalsQuery.data?.content ?? [];
  const invitations = invitationsQuery.data ?? [];

  // Show employer proposals section for TEAM_LEADER always,
  // or for WORKER if they have proposals (means they lead a team).
  const showJobProposals =
    isLeader ||
    (isWorker && !isLeader && !jobProposalsQuery.isLoading && jobProposals.length > 0);

  // Show loading skeleton until mount resolves auth state
  if (!mounted) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-10">
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-56 animate-pulse rounded bg-neutral-100" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-10">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-950">{t("proposals.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("proposals.sub")}</p>
        </div>

        {/* Team leader: employer job proposals */}
        {showJobProposals && (
          <Section
            title={t("proposals.jobTitle")}
            subtitle={t("proposals.jobSub")}
            isEmpty={!jobProposalsQuery.isLoading && jobProposals.length === 0}
            emptyMessage={t("proposals.jobEmpty")}
          >
            {jobProposalsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : jobProposals.map((p) => <JobProposalCard key={p.publicId} proposal={p} />)
            }
          </Section>
        )}

        {/* Team leader: member proposals from workers */}
        {isLeader && (
          <Section
            title={t("proposals.memberTitle")}
            subtitle={t("proposals.memberSub")}
            isEmpty={!memberProposalsQuery.isLoading && memberProposals.length === 0}
            emptyMessage={t("proposals.memberEmpty")}
          >
            {memberProposalsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : memberProposals.map((p) => <MemberProposalCard key={p.publicId} proposal={p} />)
            }
          </Section>
        )}

        {/* Worker (non-leader): team invitations received */}
        {isWorker && !isLeader && (
          <Section
            title={t("proposals.inviteTitle")}
            subtitle={t("proposals.inviteSub")}
            isEmpty={!invitationsQuery.isLoading && invitations.length === 0}
            emptyMessage={t("proposals.inviteEmpty")}
          >
            {invitationsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : invitations.map((inv) => <TeamInvitationCard key={inv.invitationId} invitation={inv} />)
            }
          </Section>
        )}
      </div>
    </AppLayout>
  );
}
