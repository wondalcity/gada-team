"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Settings,
  MapPin,
  Globe,
  X,
  Phone,
  ChevronRight,
  Bell,
  Building2,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, TeamResponse, TeamMemberResponse } from "@/lib/teams-api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function TeamTypeBadge({ type }: { type: string }) {
  const isCompany = type === "COMPANY_LINKED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold",
        isCompany
          ? "bg-secondary-100 text-secondary-600"
          : "bg-primary-50 text-primary-500"
      )}
    >
      {isCompany ? (
        <Building2 className="h-3 w-3" />
      ) : (
        <Users className="h-3 w-3" />
      )}
      {isCompany ? "기업 소속" : "스쿼드"}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isLeader = role === "LEADER";
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold",
        isLeader
          ? "bg-warning-100 text-warning-700"
          : "bg-neutral-100 text-neutral-600"
      )}
    >
      {isLeader ? "팀장" : "팀원"}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-neutral-200", className)} />
  );
}

function TeamCardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white shadow-card-md overflow-hidden">
      <div className="h-40 animate-pulse bg-neutral-200" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Invite Sheet ─────────────────────────────────────────────────────────────

interface InviteSheetProps {
  teamPublicId: string;
  open: boolean;
  onClose: () => void;
}

function InviteSheet({ teamPublicId, open, onClose }: InviteSheetProps) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = React.useState("");
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (phone: string) => teamsApi.inviteMember(teamPublicId, phone),
    onSuccess: () => {
      setFeedback({ type: "success", message: "초대장을 발송했어요!" });
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["team", "mine"] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: err?.message || "초대에 실패했어요. 다시 시도해주세요.",
      });
    },
  });

  React.useEffect(() => {
    if (!open) {
      setPhone("");
      setFeedback(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel: bottom sheet on mobile, right side panel on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up rounded-t-2xl bg-white p-6 shadow-2xl lg:bottom-0 lg:right-0 lg:left-auto lg:top-0 lg:w-96 lg:rounded-none lg:rounded-l-2xl lg:animate-slide-in-right">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">팀원 초대</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              전화번호로 팀원을 초대하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 transition-colors hover:bg-neutral-200"
          >
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              전화번호
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full rounded-lg border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {feedback && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
                feedback.type === "success"
                  ? "bg-success-50 text-success-700"
                  : "bg-danger-50 text-danger-700"
              )}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          <button
            onClick={() => inviteMutation.mutate(phone)}
            disabled={!phone.trim() || inviteMutation.isPending}
            className="w-full rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-[0.98]"
          >
            {inviteMutation.isPending ? "발송 중..." : "초대장 보내기"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Member Card ───────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: TeamMemberResponse;
  isCurrentUserLeader: boolean;
  teamPublicId: string;
}

function MemberCard({
  member,
  isCurrentUserLeader,
  teamPublicId,
}: MemberCardProps) {
  const queryClient = useQueryClient();
  const removeMutation = useMutation({
    mutationFn: () => teamsApi.removeMember(teamPublicId, member.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "mine"] });
    },
  });

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {member.profileImageUrl ? (
          <img
            src={member.profileImageUrl}
            alt={member.fullName}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-base font-bold text-white">
            {getInitials(member.fullName)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-neutral-900">
            {member.fullName || "이름 없음"}
          </span>
          <RoleBadge role={member.role} />
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          {[member.nationality, member.visaType].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Remove button — only for non-leader members, visible to leader */}
      {isCurrentUserLeader && member.role === "MEMBER" && (
        <button
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-50 text-danger-500 transition-colors hover:bg-danger-100 hover:text-danger-700 disabled:opacity-50"
          title="팀원 내보내기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Invitations Banner ────────────────────────────────────────────────────────

function InvitationsBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Link
      href="/invitations"
      className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-warning-400 px-4 py-3.5 transition-opacity hover:opacity-90"
    >
      <Bell className="h-5 w-5 flex-shrink-0 text-neutral-900" />
      <span className="flex-1 text-sm font-semibold text-neutral-900">
        <span className="font-extrabold">{count}개</span>의 팀 초대가
        있습니다
      </span>
      <ChevronRight className="h-4 w-4 text-neutral-700" />
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
        <Users className="h-10 w-10 text-primary-500" />
      </div>
      <h2 className="text-xl font-extrabold text-neutral-950">
        아직 팀이 없어요
      </h2>
      <p className="mt-2 max-w-xs text-sm text-neutral-500 leading-relaxed">
        지금 팀을 만들어 건설 현장에서 함께 일할 팀원을 모집하세요
      </p>
      <Link
        href="/teams/new"
        className="mt-7 rounded-lg bg-primary-500 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md active:scale-[0.98]"
      >
        팀 만들기
      </Link>
    </div>
  );
}

// ─── Team Hub Content ─────────────────────────────────────────────────────────

function TeamHubContent() {
  const user = useAuthStore((s) => s.user);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const {
    data: team,
    isLoading: teamLoading,
    isError: teamError,
  } = useQuery({
    queryKey: ["team", "mine"],
    queryFn: () => teamsApi.getMyTeam(),
    retry: (failureCount, err: any) => {
      if (err?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const { data: invitations } = useQuery({
    queryKey: ["invitations", "mine"],
    queryFn: () => teamsApi.getMyInvitations(),
    initialData: [],
  });

  const pendingInvitations = invitations?.filter(
    (inv) => inv.status === "PENDING"
  ) ?? [];

  const isLeader = user && team ? user.userId === team.leaderId : false;

  if (teamLoading) {
    return (
      <div className="space-y-4 px-4 py-4">
        <InvitationsBanner count={pendingInvitations.length} />
        <TeamCardSkeleton />
        <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasNoTeam = teamError || !team;

  return (
    <>
      {/* Invitations banner */}
      <InvitationsBanner count={pendingInvitations.length} />

      {hasNoTeam ? (
        <EmptyState />
      ) : (
        <div className="space-y-4 px-4 py-4">
          {/* ── Team Card ── */}
          <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-card-md">
            {/* Cover */}
            {team.coverImageUrl ? (
              <div
                className="h-40 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${team.coverImageUrl})` }}
              />
            ) : (
              <div className="h-40 w-full bg-gradient-to-br from-primary-500 to-primary-600" />
            )}

            <div className="p-5">
              {/* Name + type */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-neutral-950">
                  {team.name}
                </h1>
                <TeamTypeBadge type={team.teamType} />
              </div>

              {/* Leader */}
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-neutral-500">
                <Shield className="h-3.5 w-3.5 text-warning-500" />
                <span className="font-semibold text-warning-700">팀장</span>
                {team.leaderName}
              </p>

              {/* Intro */}
              {team.introShort && (
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  {team.introShort}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* Member progress */}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm font-semibold text-neutral-700">
                    {team.memberCount}명
                    {team.headcountTarget
                      ? ` / ${team.headcountTarget}명`
                      : ""}
                  </span>
                  {team.headcountTarget && (
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (team.memberCount / team.headcountTarget) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Region */}
                {team.isNationwide ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">
                    <Globe className="h-3 w-3" />
                    전국
                  </span>
                ) : team.regions.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {team.regions
                      .slice(0, 3)
                      .map((r) => r.sido)
                      .join(", ")}
                    {team.regions.length > 3 &&
                      ` 외 ${team.regions.length - 3}`}
                  </span>
                ) : null}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  팀원 초대
                </button>
                {isLeader && (
                  <Link
                    href={`/teams/${team.publicId}/edit`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98]"
                  >
                    <Settings className="h-4 w-4" />
                    팀 편집
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Members Section ── */}
          {team.members && team.members.length > 0 && (
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
              <h2 className="mb-1 text-base font-bold text-neutral-950">
                팀원 목록{" "}
                <span className="text-primary-500">({team.members.length}명)</span>
              </h2>
              <div className="divide-y divide-neutral-100">
                {team.members.map((member) => (
                  <MemberCard
                    key={member.memberId}
                    member={member}
                    isCurrentUserLeader={isLeader}
                    teamPublicId={team.publicId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite sheet */}
      {team && (
        <InviteSheet
          teamPublicId={team.publicId}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTeamPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <div className="px-4 pt-5 pb-2">
          <h1 className="text-xl font-extrabold text-neutral-950">내 팀</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            팀을 관리하고 팀원을 초대하세요
          </p>
        </div>
        <TeamHubContent />
      </div>
    </AppLayout>
  );
}
