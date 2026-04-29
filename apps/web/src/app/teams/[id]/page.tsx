"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MapPin,
  Globe,
  Wrench,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserCheck,
  Shield,
  Building2,
  AlertCircle,
  Phone,
  UserPlus,
  X,
  CheckCircle2,
  Clock,
  MessageCircle,
  Coins,
  Send,
  Inbox,
  Briefcase,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, TeamResponse, TeamMemberResponse, WorkScheduleResponse } from "@/lib/teams-api";
import { equipmentLabel } from "@/lib/equipment-labels";
import { chatApi, memberProposalApi, workerTeamProposalApi } from "@/lib/chat-api";
import { employerApi } from "@/lib/employer-api";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

// Maps common nationality strings to ISO 3166-1 alpha-2 codes for flag emoji
const NATIONALITY_TO_CODE: Record<string, string> = {
  "베트남": "VN", "VIETNAM": "VN", "VN": "VN",
  "한국": "KR", "KOREA": "KR", "KR": "KR", "대한민국": "KR",
  "중국": "CN", "CHINA": "CN", "CN": "CN",
  "필리핀": "PH", "PHILIPPINES": "PH", "PH": "PH",
  "인도네시아": "ID", "INDONESIA": "ID", "ID": "ID",
  "태국": "TH", "THAILAND": "TH", "TH": "TH",
  "미얀마": "MM", "MYANMAR": "MM", "MM": "MM",
  "캄보디아": "KH", "CAMBODIA": "KH", "KH": "KH",
  "몽골": "MN", "MONGOLIA": "MN", "MN": "MN",
  "스리랑카": "LK", "SRI LANKA": "LK", "LK": "LK",
  "네팔": "NP", "NEPAL": "NP", "NP": "NP",
  "방글라데시": "BD", "BANGLADESH": "BD", "BD": "BD",
  "우즈베키스탄": "UZ", "UZBEKISTAN": "UZ", "UZ": "UZ",
  "카자흐스탄": "KZ", "KAZAKHSTAN": "KZ", "KZ": "KZ",
  "키르기스스탄": "KG", "KYRGYZSTAN": "KG", "KG": "KG",
};

function countryFlag(nationality?: string | null): string {
  if (!nationality) return "";
  const code = NATIONALITY_TO_CODE[nationality.trim().toUpperCase()] ?? NATIONALITY_TO_CODE[nationality.trim()];
  if (!code) return "";
  // Convert ISO code to flag emoji (regional indicator symbols)
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

function NationalityDisplay({ nationality }: { nationality?: string | null }) {
  if (!nationality) return <span className="text-neutral-400">-</span>;
  const flag = countryFlag(nationality);
  return (
    <span className="inline-flex items-center gap-1.5">
      {flag && <span className="text-base leading-none">{flag}</span>}
      <span className="text-sm text-neutral-700">{nationality}</span>
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPay(min?: number, max?: number, unit?: string, t?: ReturnType<typeof useT>): string {
  const unitLabel: Record<string, string> = {
    DAILY: t ? t("filter.payDaily") : "일",
    MONTHLY: t ? t("filter.payMonthly") : "월",
    HOURLY: t ? t("filter.payHourly") : "시간",
  };
  const unitStr = unit ? unitLabel[unit] ?? unit : "";
  if (!min && !max) return "–";
  if (min && max)
    return `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원/${unitStr}`;
  if (min) return `${min.toLocaleString("ko-KR")}원/${unitStr} 이상`;
  return `${max!.toLocaleString("ko-KR")}원/${unitStr} 이하`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-neutral-200", className)} />
  );
}

function TeamDetailSkeleton() {
  return (
    <div>
      <div className="h-56 animate-pulse bg-neutral-200" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-100 bg-white p-5 space-y-3"
              >
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-100 bg-white p-5 space-y-3"
              >
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Health Badge ─────────────────────────────────────────────────────────────

function HealthBadge({ status }: { status?: string }) {
  const t = useT();
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    COMPLETED: {
      label: t("profile.health.done"),
      className: "bg-success-50 text-success-700",
    },
    NOT_DONE: {
      label: t("profile.health.notDone"),
      className: "bg-neutral-100 text-neutral-500",
    },
    EXPIRED: {
      label: t("profile.health.expired"),
      className: "bg-danger-50 text-danger-700",
    },
  };
  const c = config[status] ?? {
    label: status,
    className: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", c.className)}>
      {c.label}
    </span>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const t = useT();
  const isLeader = role === "LEADER";
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold",
        isLeader
          ? "bg-secondary-100 text-secondary-600"
          : "bg-primary-50 text-primary-500"
      )}
    >
      {isLeader ? t("teamDetail.leaderLabel") : t("worker.memberBadge")}
    </span>
  );
}

// ─── Expandable Section ────────────────────────────────────────────────────────

function ExpandableText({ text }: { text: string }) {
  const t = useT();
  const [expanded, setExpanded] = React.useState(false);
  const isLong = text.length > 200;
  const display = isLong && !expanded ? text.slice(0, 200) + "..." : text;

  return (
    <div>
      <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary-500"
        >
          {expanded ? (
            <>
              {t("teamDetail.collapse")} <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              {t("teamDetail.expand")} <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Employer Chat Sheet ──────────────────────────────────────────────────────
// Opens/creates a chat room with the team leader (costs 1 point if new)

function EmployerChatSheet({
  teamPublicId,
  teamName,
  leaderName,
  leaderProfileImageUrl,
  open,
  onClose,
}: {
  teamPublicId: string;
  teamName: string;
  leaderName?: string;
  leaderProfileImageUrl?: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [isInsufficient, setIsInsufficient] = React.useState(false);

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ["pointBalance"],
    queryFn: employerApi.getPointBalance,
    enabled: open,
  });

  const hasBalance = (balance?.balance ?? 0) > 0;

  React.useEffect(() => {
    if (!open) {
      setStatus("idle");
      setErrorMsg("");
      setIsInsufficient(false);
    } else {
      refetchBalance();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  async function handleStartChat() {
    setStatus("loading");
    setErrorMsg("");
    setIsInsufficient(false);
    try {
      const room = await chatApi.openRoom(teamPublicId);
      router.push(`/employer/chats/${room.publicId}`);
    } catch (err: any) {
      setStatus("error");
      if (err?.code === "INSUFFICIENT_POINTS" || err?.message?.includes("포인트 잔액")) {
        setIsInsufficient(true);
        setErrorMsg("포인트 잔액이 부족합니다. 포인트를 충전해 주세요.");
      } else {
        setErrorMsg(err?.message || "채팅 시작에 실패했어요. 다시 시도해주세요.");
      }
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-6 shadow-2xl lg:bottom-0 lg:right-0 lg:left-auto lg:top-0 lg:w-96 lg:rounded-none lg:rounded-l-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">{t("teamDetail.chatTitle")}</h2>
            <p className="mt-0.5 text-sm text-neutral-500">{teamName}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        {/* Leader info */}
        <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-4 mb-4">
          {leaderProfileImageUrl ? (
            <img src={leaderProfileImageUrl} alt={leaderName} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              {leaderName?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-neutral-900">{leaderName ?? t("teamDetail.noName")}</p>
            <span className="inline-block rounded-md bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-700 mt-0.5">{t("teamDetail.leaderLabel")}</span>
          </div>
        </div>

        {/* Point balance row */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm mb-4",
          hasBalance ? "bg-primary-50 text-primary-700" : "bg-danger-50 text-danger-600"
        )}>
          <Coins className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium flex-1">잔액 {balance?.balance ?? "…"}P · 채팅 개설 시 1P 차감</span>
          {!hasBalance && (
            <Link href="/employer/points" onClick={onClose} className="flex-shrink-0 text-xs font-semibold underline">
              충전하기
            </Link>
          )}
        </div>

        {status === "error" && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
            <span className="flex items-center gap-2">
              <X className="h-4 w-4 flex-shrink-0" />
              {errorMsg}
            </span>
            {isInsufficient && (
              <Link href="/employer/points" onClick={onClose} className="flex-shrink-0 text-xs font-semibold underline">
                충전하기
              </Link>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
            {t("common.cancel")}
          </button>
          <button
            onClick={handleStartChat}
            disabled={status === "loading" || !hasBalance}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            {status === "loading" ? t("teamDetail.chatConnecting") : t("teamDetail.chatStart")}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Worker Proposal Sheet ────────────────────────────────────────────────────
// Worker sends a "팀원으로 제안하기" to the team leader

function WorkerProposalSheet({
  teamPublicId,
  teamName,
  leaderName,
  leaderProfileImageUrl,
  open,
  onClose,
}: {
  teamPublicId: string;
  teamName: string;
  leaderName?: string;
  leaderProfileImageUrl?: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    if (!open) { setMessage(""); setStatus("idle"); setErrorMsg(""); }
  }, [open]);

  if (!open) return null;

  async function handleSend() {
    setStatus("loading");
    setErrorMsg("");
    try {
      await memberProposalApi.sendProposal(teamPublicId, message.trim() || undefined);
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "제안 전송에 실패했어요. 다시 시도해주세요.");
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-6 shadow-2xl lg:bottom-0 lg:right-0 lg:left-auto lg:top-0 lg:w-96 lg:rounded-none lg:rounded-l-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">{t("teamDetail.proposeTitle")}</h2>
            <p className="mt-0.5 text-sm text-neutral-500">{teamName}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        {/* Leader info */}
        <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-4 mb-5">
          {leaderProfileImageUrl ? (
            <img src={leaderProfileImageUrl} alt={leaderName} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              {leaderName?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-neutral-900">{leaderName ?? t("teamDetail.noName")}</p>
            <span className="inline-block rounded-md bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-700 mt-0.5">{t("teamDetail.leaderLabel")}</span>
          </div>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
                <CheckCircle2 className="h-7 w-7 text-success-600" />
              </div>
              <p className="font-semibold text-neutral-900">{t("teamDetail.proposeSent")}</p>
              <p className="text-sm text-neutral-500">{t("teamDetail.proposeSentSub")}</p>
            </div>
            <button onClick={onClose} className="w-full rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
              {t("common.confirm")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                {t("teamDetail.proposeMsgLabel")} <span className="font-normal text-neutral-400">{t("teamDetail.proposeMsgOptional")}</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("teamDetail.proposeMsgPlaceholder")}
                rows={4}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
                <X className="h-4 w-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSend}
                disabled={status === "loading"}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                {status === "loading" ? t("teamDetail.proposeSending") : t("teamDetail.proposeSendBtn")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Invite Sheet ─────────────────────────────────────────────────────────────

function InviteSheet({
  teamPublicId,
  open,
  onClose,
}: {
  teamPublicId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [phone, setPhone] = React.useState("");
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (p: string) => teamsApi.inviteMember(teamPublicId, p),
    onSuccess: () => {
      setFeedback({ type: "success", message: t("teamDetail.invSuccess") });
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["team", teamPublicId] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: err?.message || "초대에 실패했어요. 다시 시도해주세요.",
      });
    },
  });

  React.useEffect(() => {
    if (!open) { setPhone(""); setFeedback(null); }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-6 shadow-2xl lg:bottom-0 lg:right-0 lg:left-auto lg:top-0 lg:w-96 lg:rounded-none lg:rounded-l-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">{t("teamDetail.invTitle")}</h2>
            <p className="mt-0.5 text-sm text-neutral-500">{t("teamDetail.invSub")}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">{t("teamDetail.invPhone")}</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full rounded-lg border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          {feedback && (
            <div className={cn("flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
              feedback.type === "success" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700")}>
              {feedback.type === "success"
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                : <X className="h-4 w-4 flex-shrink-0" />}
              {feedback.message}
            </div>
          )}
          <button
            onClick={() => inviteMutation.mutate(phone)}
            disabled={!phone.trim() || inviteMutation.isPending}
            className="w-full rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {inviteMutation.isPending ? t("teamDetail.invSending") : t("teamDetail.invSend")}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Received Proposals Section ──────────────────────────────────────────────

function ProposalStatusBadge({ status }: { status: string }) {
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
      {(status === "DECLINED" || status === "EXPIRED") && <X className="h-3 w-3" />}
      {t(`proposals.status.${status}` as any) || status}
    </span>
  );
}

function ReceivedProposalsSection({ teamPublicId }: { teamPublicId: string }) {
  const t = useT();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["team-received-proposals", teamPublicId],
    queryFn: () => workerTeamProposalApi.listReceived(0, 20, teamPublicId),
  });

  const proposals = data?.content ?? [];

  const respondMutation = useMutation({
    mutationFn: ({ publicId, status }: { publicId: string; status: "ACCEPTED" | "DECLINED" }) =>
      workerTeamProposalApi.respond(publicId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-received-proposals", teamPublicId] });
    },
  });

  return (
    <div className="mt-5 rounded-lg border border-neutral-100 bg-white shadow-card-md overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-neutral-800">{t("teamDetail.receivedProposals")}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">{t("teamDetail.receivedProposalsSub")}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center px-4">
          <Inbox className="mb-2 h-8 w-8 text-neutral-200" />
          <p className="text-sm text-neutral-400">{t("teamDetail.proposalEmpty")}</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {proposals.map((p) => (
            <div key={p.publicId} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
                    <Briefcase className="h-4 w-4 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {p.jobTitle ?? t("proposals.defaultJobTitle")}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
                <ProposalStatusBadge status={p.status} />
              </div>
              {p.message && (
                <p className="mt-3 text-sm text-neutral-600 rounded-lg bg-neutral-50 px-3 py-2 leading-relaxed">
                  {p.message}
                </p>
              )}
              <div className="mt-2">
                <Link
                  href={`/jobs/${p.jobPublicId}`}
                  className="text-xs font-medium text-primary-500 hover:underline"
                >
                  {t("teamDetail.proposalViewJob")}
                </Link>
              </div>
              {p.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => respondMutation.mutate({ publicId: p.publicId, status: "ACCEPTED" })}
                    disabled={respondMutation.isPending}
                    className="flex-1 rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
                  >
                    {t("teamDetail.proposalAccept")}
                  </button>
                  <button
                    onClick={() => respondMutation.mutate({ publicId: p.publicId, status: "DECLINED" })}
                    disabled={respondMutation.isPending}
                    className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
                  >
                    {t("teamDetail.proposalDecline")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team Schedule Section ────────────────────────────────────────────────────

function statusConfig(status: string) {
  if (status === "ONGOING") return { label: "투입 중", className: "bg-success-100 text-success-700" };
  if (status === "COMPLETED") return { label: "완료", className: "bg-neutral-100 text-neutral-500" };
  return { label: "예정", className: "bg-primary-50 text-primary-600" };
}

function TeamScheduleSection({ teamPublicId }: { teamPublicId: string }) {
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["team-schedules", teamPublicId],
    queryFn: () => teamsApi.getSchedules(teamPublicId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  const list = schedules ?? [];
  if (list.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-800">
        <Briefcase className="h-4 w-4 text-primary-500" />
        현장 투입 스케쥴
      </h2>
      <div className="space-y-3">
        {list.map((s) => {
          const cfg = statusConfig(s.status);
          return (
            <div key={s.publicId} className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-neutral-900 leading-tight">{s.siteName}</p>
                <span className={cn("flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold", cfg.className)}>
                  {cfg.label}
                </span>
              </div>
              {s.siteAddress && (
                <p className="flex items-center gap-1 text-xs text-neutral-500 mb-1.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {s.siteAddress}
                </p>
              )}
              <p className="text-xs text-neutral-600 leading-relaxed mb-2">{s.workDescription}</p>
              <p className="flex items-center gap-1 text-xs text-neutral-400">
                <Calendar className="h-3 w-3" />
                {s.startDate}{s.endDate ? ` ~ ${s.endDate}` : " ~"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Team Detail Content ──────────────────────────────────────────────────────

function TeamDetailContent({ id }: { id: string }) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [proposalOpen, setProposalOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: team,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamsApi.getTeam(id),
  });

  if (isLoading) return <TeamDetailSkeleton />;

  if (isError || !team) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <AlertCircle className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-base font-bold text-neutral-700">
          {t("teamDetail.notFound")}
        </p>
        <Link
          href="/teams/mine"
          className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("teamDetail.backToMine")}
        </Link>
      </div>
    );
  }

  const isCompany = team.teamType === "COMPANY_LINKED";
  const hasEquipment = team.equipment?.length > 0;
  const hasPortfolio = team.portfolio?.length > 0;
  // All auth flags are gated on `mounted` so SSR always renders the same
  // fallback button and React hydration never hits a structural mismatch.
  const isLeader = mounted ? (user ? user.userId === team.leaderId : false) : false;
  const isEmployer = mounted && user?.role === "EMPLOYER";
  // isTeamLeaderElsewhere: TEAM_LEADER role but not the leader of THIS team
  const isTeamLeaderElsewhere = mounted && !isLeader && user?.role === "TEAM_LEADER";
  // isWorker: plain WORKER (no team leadership anywhere)
  const isWorker = mounted && !isLeader && user?.role === "WORKER";

  return (
    <div>
      {/* ── HERO ── */}
      <div className="relative h-56 overflow-hidden">
        {team.coverImageUrl ? (
          <>
            <img
              src={team.coverImageUrl}
              alt={team.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary-500 to-primary-600" />
        )}

        {/* Breadcrumb */}
        <div className="absolute top-4 left-0 right-0 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 text-xs text-white/70">
            <span>GADA</span>
            <ChevronRight className="h-3 w-3" />
            <span>{t("teamDetail.breadcrumb")}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">{team.name}</span>
          </div>
        </div>

        {/* Title area */}
        <div className="absolute bottom-5 left-0 right-0 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold",
                isCompany
                  ? "bg-secondary-500/90 text-white"
                  : "bg-white/20 text-white backdrop-blur-sm"
              )}
            >
              {isCompany ? (
                <Building2 className="h-3 w-3" />
              ) : (
                <Users className="h-3 w-3" />
              )}
              {isCompany ? t("teamDetail.companyType") : t("teamDetail.squadType")}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white drop-shadow">
            {team.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-white/80 text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {t("teamDetail.memberN", team.memberCount)}
            </span>
            {team.companyName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {team.companyName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* ── Main column ── */}
          <div className="space-y-4 lg:col-span-2">
            {/* 팀 소개 */}
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-800">
                <Shield className="h-4 w-4 text-primary-500" />
                {t("teamDetail.intro")}
              </h2>
              {team.introShort && (
                <p className="mb-3 text-base font-semibold text-neutral-900">
                  {team.introShort}
                </p>
              )}
              {team.introLong && <ExpandableText text={team.introLong} />}
              {!team.introShort && !team.introLong && (
                <p className="text-sm text-neutral-400">{t("teamDetail.noIntro")}</p>
              )}
            </div>

            {/* 활동 지역 */}
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-800">
                <MapPin className="h-4 w-4 text-primary-500" />
                {t("teamDetail.region")}
              </h2>
              {team.isNationwide ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-3 py-1.5 text-sm font-semibold text-success-700">
                  <Globe className="h-4 w-4" />
                  {t("teamDetail.nationwide")}
                </span>
              ) : team.regions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {team.regions.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-500"
                    >
                      {r.sido}
                      {r.sigungu ? ` ${r.sigungu}` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">{t("teamDetail.noRegion")}</p>
              )}
            </div>

            {/* 보유 장비 */}
            {hasEquipment && (
              <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-800">
                  <Wrench className="h-4 w-4 text-primary-500" />
                  {t("teamDetail.equipment")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {team.equipment.map((eq, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700"
                    >
                      {equipmentLabel(eq)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 현장 투입 스케쥴 */}
            <TeamScheduleSection teamPublicId={team.publicId} />

            {/* 포트폴리오 */}
            {hasPortfolio && (
              <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-800">
                  <Calendar className="h-4 w-4 text-primary-500" />
                  {t("teamDetail.portfolio")}
                </h2>
                <div className="space-y-4">
                  {team.portfolio.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-100 p-4"
                    >
                      <h3 className="font-semibold text-neutral-900">
                        {item.title}
                      </h3>
                      {(item.startDate || item.endDate) && (
                        <p className="mt-1 text-xs text-neutral-400">
                          {formatDate(item.startDate)}
                          {item.endDate ? ` ~ ${formatDate(item.endDate)}` : ""}
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {item.imageUrls?.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {item.imageUrls.map((url, j) => (
                            <img
                              key={j}
                              src={url}
                              alt=""
                              className="h-24 w-32 flex-shrink-0 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4 lg:col-span-1">
            {/* 팀장 */}
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
              <h2 className="mb-3 text-sm font-bold text-neutral-800">{t("teamDetail.leaderLabel")}</h2>
              <div className="flex items-center gap-3">
                {team.leaderProfileImageUrl ? (
                  <img
                    src={team.leaderProfileImageUrl}
                    alt={team.leaderName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
                    {getInitials(team.leaderName)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-neutral-900">
                    {team.leaderName ?? t("teamDetail.noName")}
                  </p>
                  <span className="inline-block rounded-md bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-700 mt-0.5">
                    {t("teamDetail.leaderLabel")}
                  </span>
                </div>
              </div>
              {isLeader ? (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("teamDetail.inviteByPhone")}
                </button>
              ) : isEmployer ? (
                <button
                  onClick={() => setChatOpen(true)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("teamDetail.chatWithLeader")}
                </button>
              ) : isTeamLeaderElsewhere ? (
                <div className="mt-4 space-y-2">
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-sm font-semibold text-neutral-400 cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    {t("teamDetail.propose")}
                  </button>
                  <p className="text-center text-xs text-neutral-400">
                    {t("teamDetail.leaderBelongs")}
                  </p>
                </div>
              ) : isWorker ? (
                <button
                  onClick={() => setProposalOpen(true)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary-500 py-2.5 text-sm font-semibold text-primary-500 transition-all hover:bg-primary-50 active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  {t("teamDetail.propose")}
                </button>
              ) : (
                <button
                  onClick={() => setProposalOpen(true)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary-500 py-2.5 text-sm font-semibold text-primary-500 transition-all hover:bg-primary-50 active:scale-[0.98]"
                >
                  <Phone className="h-4 w-4" />
                  {t("teamDetail.contactLeader")}
                </button>
              )}
            </div>

            {/* 모집 조건 */}
            <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-800">
                <UserCheck className="h-4 w-4 text-primary-500" />
                {t("teamDetail.recruit")}
              </h2>
              <div className="space-y-3">
                {team.headcountTarget && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">{t("teamDetail.headcount")}</span>
                    <span className="font-semibold text-neutral-900">
                      {t("teamDetail.memberN", team.memberCount)} / {t("teamDetail.memberN", team.headcountTarget)}
                    </span>
                  </div>
                )}
                {(team.desiredPayMin || team.desiredPayMax) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">{t("teamDetail.desiredPay")}</span>
                    <span className="font-semibold text-neutral-900">
                      {formatPay(
                        team.desiredPayMin,
                        team.desiredPayMax,
                        team.desiredPayUnit,
                        t
                      )}
                    </span>
                  </div>
                )}
                {team.headcountTarget && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
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
            </div>

            {/* 팀원 미리보기 */}
            {team.members && team.members.length > 0 && (
              <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
                <h2 className="mb-3 text-sm font-bold text-neutral-800">
                  {t("teamDetail.memberPreview")}
                </h2>
                {/* Avatars row */}
                <div className="flex -space-x-2 mb-3">
                  {team.members.slice(0, 5).map((m) => {
                    const avatar = (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary-500 text-xs font-bold text-white"
                        title={m.fullName}
                      >
                        {getInitials(m.fullName)}
                      </div>
                    );
                    return m.workerProfilePublicId ? (
                      <Link key={m.memberId} href={`/workers/${m.workerProfilePublicId}`}>{avatar}</Link>
                    ) : (
                      <React.Fragment key={m.memberId}>{avatar}</React.Fragment>
                    );
                  })}
                  {team.members.length > 5 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-semibold text-neutral-600">
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {team.members.slice(0, 3).map((m) => (
                    m.workerProfilePublicId ? (
                      <Link
                        key={m.memberId}
                        href={`/workers/${m.workerProfilePublicId}`}
                        className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
                      >
                        {m.fullName ?? t("teamDetail.noName")}
                        {m.role === "LEADER" && (
                          <span className="text-warning-700">({t("teamDetail.leaderLabel")})</span>
                        )}
                      </Link>
                    ) : (
                      <p key={m.memberId} className="text-xs text-neutral-600">
                        {m.fullName ?? t("teamDetail.noName")}
                        {m.role === "LEADER" && (
                          <span className="ml-1 text-warning-700">({t("teamDetail.leaderLabel")})</span>
                        )}
                      </p>
                    )
                  ))}
                  {team.members.length > 3 && (
                    <p className="text-xs text-neutral-400">
                      {t("teamDetail.moreMembers", team.members.length - 3)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Invite Sheet (팀장 전용) ── */}
        <InviteSheet
          teamPublicId={team.publicId}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />

        {/* ── Employer Chat Sheet ── */}
        <EmployerChatSheet
          teamPublicId={team.publicId}
          teamName={team.name}
          leaderName={team.leaderName}
          leaderProfileImageUrl={team.leaderProfileImageUrl}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />

        {/* ── Worker Proposal Sheet ── */}
        <WorkerProposalSheet
          teamPublicId={team.publicId}
          teamName={team.name}
          leaderName={team.leaderName}
          leaderProfileImageUrl={team.leaderProfileImageUrl}
          open={proposalOpen}
          onClose={() => setProposalOpen(false)}
        />

        {/* ── Received Proposals (팀장 전용) ── */}
        {isLeader && <ReceivedProposalsSection teamPublicId={team.publicId} />}

        {/* ── Full Members Table ── */}
        {team.members && team.members.length > 0 && (
          <div className="mt-5 rounded-lg border border-neutral-100 bg-white shadow-card-md overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-bold text-neutral-800">
                {t("teamDetail.memberList")}
              </h2>
            </div>
            {/* Mobile: cards */}
            <div className="divide-y divide-neutral-100 lg:hidden">
              {team.members.map((m) => {
                const Inner = (
                  <>
                    <div className="relative flex-shrink-0">
                      {m.profileImageUrl ? (
                        <img src={m.profileImageUrl} alt={m.fullName} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                          {getInitials(m.fullName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-neutral-900">
                          {m.fullName ?? t("teamDetail.noName")}
                        </span>
                        <RoleBadge role={m.role} />
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 flex items-center gap-1">
                        {m.nationality && (
                          <>
                            <span className="text-sm leading-none">{countryFlag(m.nationality)}</span>
                            <span>{m.nationality}</span>
                            {m.visaType && <span>·</span>}
                          </>
                        )}
                        {m.visaType && <span>{m.visaType}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <HealthBadge status={m.healthCheckStatus} />
                      {m.workerProfilePublicId && (
                        <ChevronRight className="h-4 w-4 text-neutral-300" />
                      )}
                    </div>
                  </>
                );
                return m.workerProfilePublicId ? (
                  <Link
                    key={m.memberId}
                    href={`/workers/${m.workerProfilePublicId}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                  >
                    {Inner}
                  </Link>
                ) : (
                  <div key={m.memberId} className="flex items-center gap-3 px-5 py-3.5">
                    {Inner}
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">
                      {t("teamDetail.colName")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                      {t("teamDetail.colRole")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                      {t("teamDetail.colNationality")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                      {t("teamDetail.colHealth")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                      {t("teamDetail.colJoinedAt")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {team.members.map((m) => (
                    <tr
                      key={m.memberId}
                      className={cn("transition-colors hover:bg-neutral-50", m.workerProfilePublicId && "cursor-pointer")}
                      onClick={m.workerProfilePublicId ? () => window.location.href = `/workers/${m.workerProfilePublicId}` : undefined}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {m.profileImageUrl ? (
                            <img src={m.profileImageUrl} alt={m.fullName} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                              {getInitials(m.fullName)}
                            </div>
                          )}
                          <span className="font-medium text-neutral-900">
                            {m.fullName ?? t("teamDetail.noName")}
                          </span>
                          {m.workerProfilePublicId && <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="px-4 py-3.5">
                        <NationalityDisplay nationality={m.nationality} />
                      </td>
                      <td className="px-4 py-3.5">
                        <HealthBadge status={m.healthCheckStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-neutral-500 text-xs">
                        {m.joinedAt ? formatDate(m.joinedAt) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  return (
    <AppLayout>
      <TeamDetailContent id={id} />
    </AppLayout>
  );
}
