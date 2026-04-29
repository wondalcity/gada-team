"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Settings,
  MapPin,
  Globe,
  X,
  ChevronRight,
  Bell,
  Building2,
  Shield,
  CheckCircle2,
  MessageCircle,
  UserCheck,
  Clock,
  Search,
  Briefcase,
  Plus,
  CalendarDays,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  teamsApi,
  TeamResponse,
  TeamMemberResponse,
  WorkScheduleResponse,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  JobSiteItem,
} from "@/lib/teams-api";
import { workerChatApi, memberProposalApi, directChatApi, workerPointsApi, WorkerChatRoomSummary, MemberProposalItem } from "@/lib/chat-api";
import { getWorkers, WorkerListItem } from "@/lib/workers-api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/DateInput";

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

// ─── Worker Invite Row ─────────────────────────────────────────────────────────

function WorkerInviteRow({
  teamPublicId,
  worker,
  isTeamLeader,
  onChatError,
}: {
  teamPublicId: string;
  worker: WorkerListItem;
  isTeamLeader: boolean;
  onChatError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const inviteMutation = useMutation({
    mutationFn: () => teamsApi.inviteMemberByProfile(teamPublicId, worker.publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "mine"] });
    },
  });

  const chatMutation = useMutation({
    mutationFn: () => directChatApi.openRoom(worker.publicId),
    onSuccess: (room) => {
      router.push(`/chats/direct/${room.publicId}`);
    },
    onError: (err: any) => {
      if (err?.code === "INSUFFICIENT_POINTS") {
        onChatError("포인트 잔액이 부족합니다. 포인트를 충전해 주세요.");
      } else {
        onChatError(err?.message ?? "채팅 개설에 실패했습니다.");
      }
    },
  });

  return (
    <div className="flex items-center gap-3 py-3">
      {worker.profileImageUrl ? (
        <img src={worker.profileImageUrl} alt={worker.fullName} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary-600">{worker.fullName?.[0] ?? "?"}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-900 truncate">{worker.fullName}</p>
        <p className="text-xs text-neutral-400">{[worker.nationality, worker.visaType].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isTeamLeader && (
          <button
            onClick={() => chatMutation.mutate()}
            disabled={chatMutation.isPending}
            className="rounded-lg border border-primary-300 px-2.5 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-60"
            title="포인트 1P 차감 후 채팅 개설"
          >
            {chatMutation.isPending ? "…" : "채팅 (1P)"}
          </button>
        )}
        <button
          onClick={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending || inviteMutation.isSuccess}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            inviteMutation.isSuccess
              ? "bg-success-50 text-success-700 cursor-default"
              : "bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
          )}
        >
          {inviteMutation.isSuccess ? "초대됨" : inviteMutation.isPending ? "…" : "초대"}
        </button>
      </div>
    </div>
  );
}

// ─── Invite Sheet ─────────────────────────────────────────────────────────────

interface InviteSheetProps {
  teamPublicId: string;
  open: boolean;
  onClose: () => void;
  isTeamLeader: boolean;
}

function InviteSheet({ teamPublicId, open, onClose, isTeamLeader }: InviteSheetProps) {
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [keyword, setKeyword] = React.useState("");
  const [debouncedKeyword, setDebouncedKeyword] = React.useState("");

  const pointsQuery = useQuery({
    queryKey: ["tl-point-balance"],
    queryFn: () => workerPointsApi.getBalance(),
    enabled: open && isTeamLeader,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const workersQuery = useQuery({
    queryKey: ["workers-invite-search", debouncedKeyword],
    queryFn: () => getWorkers({ keyword: debouncedKeyword || undefined, page: 0, size: 20 }),
    enabled: open,
  });

  React.useEffect(() => {
    if (!open) {
      setChatError(null);
      setKeyword("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl w-full sm:max-w-md" style={{ maxHeight: "85dvh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">팀원 초대</h2>
              {isTeamLeader ? (
                <p className="mt-0.5 text-sm text-neutral-500">
                  초대 또는 직접 채팅하기 (채팅 1P 차감) ·{" "}
                  <span className={cn(
                    "font-semibold",
                    (pointsQuery.data?.balance ?? 0) > 0 ? "text-primary-600" : "text-danger-600"
                  )}>
                    잔액 {pointsQuery.data?.balance ?? "…"}P
                  </span>
                  {(pointsQuery.data?.balance ?? 1) === 0 && (
                    <Link href="/leader/points" className="ml-1.5 text-xs text-primary-500 underline">충전하기</Link>
                  )}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-neutral-500">새로운 팀원을 찾아 초대하세요</p>
              )}
            </div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 transition-colors hover:bg-neutral-200">
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>

          {/* Chat error banner */}
          {chatError && (
            <div className="mx-5 mb-2 flex items-center justify-between gap-3 rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700 flex-shrink-0">
              <span className="flex-1">{chatError}</span>
              {chatError.includes("포인트") && (
                <Link href="/leader/points" className="font-semibold underline flex-shrink-0">충전하기</Link>
              )}
              <button onClick={() => setChatError(null)} className="flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-5 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="이름으로 검색"
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-neutral-50 px-5 pb-4">
              {workersQuery.isLoading && (
                <div className="py-8 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
              )}
              {!workersQuery.isLoading && (workersQuery.data?.content ?? []).length === 0 && (
                <p className="text-center text-sm text-neutral-400 py-8">검색 결과가 없어요</p>
              )}
              {(workersQuery.data?.content ?? []).map((worker) => (
                <WorkerInviteRow
                  key={worker.publicId}
                  teamPublicId={teamPublicId}
                  worker={worker}
                  isTeamLeader={isTeamLeader}
                  onChatError={setChatError}
                />
              ))}
            </div>
          </div>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ─── Leader Chat Rooms Section ────────────────────────────────────────────────

function LeaderChatRooms() {
  const { data, isLoading } = useQuery({
    queryKey: ["leader-chat-rooms"],
    queryFn: () => workerChatApi.listRooms(0, 10),
    refetchInterval: 15000,
  });

  const rooms = data?.content ?? [];

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 mb-3" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/5 animate-pulse rounded bg-neutral-200" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rooms.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-100 bg-white shadow-card-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h2 className="text-base font-bold text-neutral-950 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary-500" />
          업체 채팅
          {rooms.some((r) => r.unreadCount > 0) && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-danger-500 px-1.5 text-[10px] font-bold text-white">
              {rooms.reduce((sum, r) => sum + r.unreadCount, 0)}
            </span>
          )}
        </h2>
      </div>
      <div className="divide-y divide-neutral-100">
        {rooms.map((room) => (
          <LeaderChatRoomRow key={room.publicId} room={room} />
        ))}
      </div>
    </div>
  );
}

function LeaderChatRoomRow({ room }: { room: WorkerChatRoomSummary }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <MessageCircle className="h-5 w-5 text-primary-500" />
          </div>
          {room.unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[9px] font-bold text-white">
              {room.unreadCount > 9 ? "9+" : room.unreadCount}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-sm font-semibold truncate", room.unreadCount > 0 ? "text-neutral-950" : "text-neutral-800")}>
              {room.employerName ?? "업체"}
            </span>
            <span className="flex-shrink-0 text-xs text-neutral-400">
              {room.lastMessageAt ? relativeTime(room.lastMessageAt) : ""}
            </span>
          </div>
          <p className={cn("mt-0.5 text-xs truncate", room.unreadCount > 0 ? "font-medium text-neutral-600" : "text-neutral-400")}>
            {room.lastMessagePreview ?? "대화를 시작해보세요"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
      </button>

      {open && (
        <LeaderChatSheet roomPublicId={room.publicId} employerName={room.employerName} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ─── Leader Chat Sheet (inline chat UI) ───────────────────────────────────────

function LeaderChatSheet({
  roomPublicId,
  employerName,
  onClose,
}: {
  roomPublicId: string;
  employerName: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leader-chat-messages", roomPublicId],
    queryFn: () => workerChatApi.getMessages(roomPublicId, 0, 100),
    refetchInterval: 5000,
  });

  const messages = React.useMemo(() => {
    const list = [...(data?.content ?? [])];
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => workerChatApi.sendMessage(roomPublicId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leader-chat-messages", roomPublicId] });
      queryClient.invalidateQueries({ queryKey: ["leader-chat-rooms"] });
    },
  });

  function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(text);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4 pointer-events-none">
      <div className="flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl pointer-events-auto w-full sm:max-w-lg" style={{ maxHeight: "85dvh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <p className="font-bold text-neutral-950">{employerName ?? "업체"}</p>
            <p className="text-xs text-neutral-400 mt-0.5">업체와의 채팅</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-neutral-50">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-neutral-400 py-8">대화를 시작해보세요!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.publicId} className={cn("flex", msg.isMine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.isMine
                    ? "rounded-tr-sm bg-primary-500 text-white"
                    : "rounded-tl-sm bg-white border border-neutral-200 text-neutral-800"
                )}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 border-t border-neutral-200 bg-white px-4 py-3 flex-shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="메시지를 입력하세요"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

// ─── Member Proposals Section (team leader) ───────────────────────────────────

function LeaderMemberProposals() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["leader-member-proposals"],
    queryFn: () => memberProposalApi.receivedProposals(0, 20),
  });

  const respondMutation = useMutation({
    mutationFn: ({ publicId, status }: { publicId: string; status: "ACCEPTED" | "DECLINED" }) =>
      memberProposalApi.respondToProposal(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leader-member-proposals"] });
    },
  });

  const proposals = data?.content ?? [];
  const pending = proposals.filter((p) => p.status === "PENDING");

  if (isLoading) return null;
  if (proposals.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-100 bg-white shadow-card-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h2 className="text-base font-bold text-neutral-950 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary-500" />
          팀원 제안
          {pending.length > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </h2>
      </div>
      <div className="divide-y divide-neutral-100">
        {proposals.map((p) => (
          <ProposalRow key={p.publicId} proposal={p} onRespond={(status) => respondMutation.mutate({ publicId: p.publicId, status })} isResponding={respondMutation.isPending} />
        ))}
      </div>
    </div>
  );
}

function ProposalRow({
  proposal,
  onRespond,
  isResponding,
}: {
  proposal: MemberProposalItem;
  onRespond: (status: "ACCEPTED" | "DECLINED") => void;
  isResponding: boolean;
}) {
  const statusConfig = {
    PENDING: { label: "대기 중", className: "bg-amber-100 text-amber-700" },
    ACCEPTED: { label: "수락됨", className: "bg-success-50 text-success-700" },
    DECLINED: { label: "거절됨", className: "bg-neutral-100 text-neutral-500" },
  };
  const cfg = statusConfig[proposal.status as keyof typeof statusConfig] ?? statusConfig.PENDING;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900">
              {proposal.proposerName ?? "이름 없음"}
            </span>
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", cfg.className)}>
              {cfg.label}
            </span>
          </div>
          {proposal.message && (
            <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed line-clamp-3">
              "{proposal.message}"
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(proposal.createdAt)}
          </p>
        </div>
      </div>

      {proposal.status === "PENDING" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onRespond("DECLINED")}
            disabled={isResponding}
            className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            거절
          </button>
          <button
            onClick={() => onRespond("ACCEPTED")}
            disabled={isResponding}
            className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            수락
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Schedule Management ──────────────────────────────────────────────────────

function scheduleStatusConfig(status: string) {
  if (status === "ONGOING") return { label: "투입 중", className: "bg-success-100 text-success-700" };
  if (status === "COMPLETED") return { label: "완료", className: "bg-neutral-100 text-neutral-500" };
  return { label: "예정", className: "bg-primary-50 text-primary-600" };
}

interface ScheduleFormState {
  jobPublicId: string;
  siteName: string;
  siteAddress: string;
  workDescription: string;
  startDate: string;
  endDate: string;
  status: string;
}

const EMPTY_FORM: ScheduleFormState = {
  jobPublicId: "",
  siteName: "",
  siteAddress: "",
  workDescription: "",
  startDate: "",
  endDate: "",
  status: "PLANNED",
};

function ScheduleSheet({
  teamPublicId,
  editing,
  onClose,
}: {
  teamPublicId: string;
  editing: WorkScheduleResponse | null; // null = create mode
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<ScheduleFormState>(EMPTY_FORM);
  const [jobKeyword, setJobKeyword] = React.useState("");
  const [debouncedKw, setDebouncedKw] = React.useState("");
  const [selectedJob, setSelectedJob] = React.useState<JobSiteItem | null>(null);
  const [jobPickerOpen, setJobPickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({
        jobPublicId: editing.jobPublicId ?? "",
        siteName: editing.siteName,
        siteAddress: editing.siteAddress ?? "",
        workDescription: editing.workDescription,
        startDate: editing.startDate,
        endDate: editing.endDate ?? "",
        status: editing.status,
      });
    } else {
      setForm(EMPTY_FORM);
      setSelectedJob(null);
    }
  }, [editing]);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedKw(jobKeyword), 350);
    return () => clearTimeout(timer);
  }, [jobKeyword]);

  const jobsQuery = useQuery({
    queryKey: ["jobs-for-schedule", debouncedKw],
    queryFn: () => teamsApi.searchJobsForSchedule(debouncedKw),
    enabled: jobPickerOpen,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) => teamsApi.createSchedule(teamPublicId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedules", teamPublicId] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSchedulePayload) =>
      teamsApi.updateSchedule(teamPublicId, editing!.publicId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedules", teamPublicId] });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error as any || updateMutation.error as any;

  function handleSelectJob(job: JobSiteItem) {
    setSelectedJob(job);
    setForm((prev) => ({
      ...prev,
      jobPublicId: job.jobPublicId,
      siteName: job.siteName ?? job.jobTitle,
      siteAddress: job.siteAddress ?? "",
    }));
    setJobPickerOpen(false);
    setJobKeyword("");
  }

  function handleClearJob() {
    setSelectedJob(null);
    setForm((prev) => ({ ...prev, jobPublicId: "", siteName: "", siteAddress: "" }));
  }

  function handleSubmit() {
    if (!form.workDescription.trim() || !form.startDate) return;
    const payload: CreateSchedulePayload = {
      jobPublicId: form.jobPublicId || undefined,
      siteName: form.siteName || undefined,
      siteAddress: form.siteAddress || undefined,
      workDescription: form.workDescription,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      status: form.status as any,
    };
    if (editing) {
      const upd: UpdateSchedulePayload = {
        siteName: form.siteName || undefined,
        siteAddress: form.siteAddress || undefined,
        workDescription: form.workDescription || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        clearEndDate: !form.endDate && !!editing.endDate ? true : undefined,
        status: form.status as any,
      };
      updateMutation.mutate(upd);
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl w-full sm:max-w-lg overflow-hidden" style={{ maxHeight: "90dvh" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-neutral-100">
            <h2 className="text-lg font-bold text-neutral-950">
              {editing ? "스케쥴 수정" : "스케쥴 등록"}
            </h2>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>

          {/* Form */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {/* Job picker */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">채용공고에서 현장 불러오기 (선택)</label>
              {selectedJob ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{selectedJob.jobTitle}</p>
                    {selectedJob.siteName && (
                      <p className="text-xs text-neutral-500 truncate">{selectedJob.siteName}{selectedJob.sidoSigungu ? ` · ${selectedJob.sidoSigungu}` : ""}</p>
                    )}
                  </div>
                  <button onClick={handleClearJob} className="flex-shrink-0 rounded p-1 hover:bg-primary-100 transition-colors">
                    <X className="h-3.5 w-3.5 text-primary-600" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setJobPickerOpen(!jobPickerOpen)}
                  className="w-full flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-500 hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                >
                  <Search className="h-4 w-4 text-neutral-400" />
                  채용공고 검색 (마감된 공고 포함)
                </button>
              )}

              {jobPickerOpen && !selectedJob && (
                <div className="mt-2 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
                  <div className="p-2">
                    <input
                      type="text"
                      value={jobKeyword}
                      onChange={(e) => setJobKeyword(e.target.value)}
                      placeholder="공고 제목 또는 현장명 검색"
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-neutral-50">
                    {jobsQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      </div>
                    ) : (jobsQuery.data ?? []).length === 0 ? (
                      <p className="py-4 text-center text-xs text-neutral-400">검색 결과가 없어요</p>
                    ) : (
                      (jobsQuery.data ?? []).map((job) => (
                        <button
                          key={job.jobPublicId}
                          type="button"
                          onClick={() => handleSelectJob(job)}
                          className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900 truncate">{job.jobTitle}</p>
                            {job.siteName && (
                              <p className="text-xs text-neutral-500 truncate">{job.siteName}{job.sidoSigungu ? ` · ${job.sidoSigungu}` : ""}</p>
                            )}
                          </div>
                          <span className={cn(
                            "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            job.jobStatus === "PUBLISHED" ? "bg-success-100 text-success-700" : "bg-neutral-100 text-neutral-500"
                          )}>
                            {job.jobStatus === "PUBLISHED" ? "공개" : "마감"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Site name (manual or from job) */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">현장명 *</label>
              <input
                type="text"
                value={form.siteName}
                onChange={(e) => setForm((p) => ({ ...p, siteName: e.target.value }))}
                placeholder="현장 이름을 입력하세요"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
              />
            </div>

            {/* Site address */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">현장 주소</label>
              <input
                type="text"
                value={form.siteAddress}
                onChange={(e) => setForm((p) => ({ ...p, siteAddress: e.target.value }))}
                placeholder="현장 주소 (선택)"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
              />
            </div>

            {/* Work description */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">투입 업무 *</label>
              <textarea
                value={form.workDescription}
                onChange={(e) => setForm((p) => ({ ...p, workDescription: e.target.value }))}
                placeholder="어떤 업무로 투입되는지 설명해주세요"
                rows={3}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">시작일 *</label>
                <DateInput
                  value={form.startDate}
                  onChange={(v) => setForm((p) => ({ ...p, startDate: v }))}
                  placeholder="시작일 선택"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">종료일</label>
                <DateInput
                  value={form.endDate}
                  onChange={(v) => setForm((p) => ({ ...p, endDate: v }))}
                  placeholder="종료일 선택"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">상태</label>
              <div className="flex gap-2">
                {(["PLANNED", "ONGOING", "COMPLETED"] as const).map((s) => {
                  const cfg = scheduleStatusConfig(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, status: s }))}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors",
                        form.status === s
                          ? `${cfg.className} border-transparent`
                          : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                      )}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
                {error?.message ?? "저장에 실패했어요."}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-neutral-100 px-5 py-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !form.workDescription.trim() || !form.startDate || !form.siteName.trim()}
              className="flex-1 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isPending ? "저장 중…" : editing ? "수정 완료" : "등록"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TeamScheduleManager({ teamPublicId, isLeader }: { teamPublicId: string; isLeader: boolean }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<WorkScheduleResponse | null>(null);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["team-schedules", teamPublicId],
    queryFn: () => teamsApi.getSchedules(teamPublicId),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => teamsApi.deleteSchedule(teamPublicId, publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedules", teamPublicId] });
    },
  });

  const list = schedules ?? [];

  function openCreate() {
    setEditingSchedule(null);
    setSheetOpen(true);
  }

  function openEdit(s: WorkScheduleResponse) {
    setEditingSchedule(s);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="rounded-lg border border-neutral-100 bg-white shadow-card-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-base font-bold text-neutral-950 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary-500" />
            현장 투입 스케쥴
          </h2>
          {isLeader && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              등록
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center px-4">
            <CalendarDays className="mb-2 h-8 w-8 text-neutral-200" />
            <p className="text-sm font-semibold text-neutral-600">등록된 스케쥴이 없어요</p>
            {isLeader && (
              <p className="mt-1 text-xs text-neutral-400">현재 투입 중인 현장을 등록해보세요</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {list.map((s) => {
              const cfg = scheduleStatusConfig(s.status);
              return (
                <div key={s.publicId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-neutral-900">{s.siteName}</p>
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", cfg.className)}>
                          {cfg.label}
                        </span>
                      </div>
                      {s.siteAddress && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {s.siteAddress}
                        </p>
                      )}
                    </div>
                    {isLeader && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
                          title="수정"
                        >
                          <Pencil className="h-3 w-3 text-neutral-600" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(s.publicId)}
                          disabled={deleteMutation.isPending}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-50 hover:bg-danger-100 transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3 text-danger-500" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed mb-1.5 line-clamp-2">{s.workDescription}</p>
                  <p className="flex items-center gap-1 text-xs text-neutral-400">
                    <Calendar className="h-3 w-3" />
                    {s.startDate}{s.endDate ? ` ~ ${s.endDate}` : " ~"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sheetOpen && (
        <ScheduleSheet
          teamPublicId={teamPublicId}
          editing={editingSchedule}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
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

          {/* ── Work Schedule (all members see, leader can manage) ── */}
          <TeamScheduleManager teamPublicId={team.publicId} isLeader={isLeader} />

          {/* ── Leader-only: Employer Chats + Member Proposals ── */}
          {isLeader && (
            <>
              <LeaderChatRooms />
              <LeaderMemberProposals />
            </>
          )}
        </div>
      )}

      {/* Invite sheet */}
      {team && (
        <InviteSheet
          teamPublicId={team.publicId}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          isTeamLeader={isLeader}
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
