"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Award,
  Briefcase,
  Wrench,
  Calendar,
  Users,
  Shield,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Languages,
  MessageCircle,
  X,
  Coins,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { getWorker, WorkerPublicProfile } from "@/lib/workers-api";
import { teamsApi, TeamResponse } from "@/lib/teams-api";
import { directChatApi, workerPointsApi } from "@/lib/chat-api";
import { equipmentLabel } from "@/lib/equipment-labels";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Label maps ───────────────────────────────────────────────────────────────

const NATIONALITY_LABELS: Record<string, string> = {
  KR: "한국", VN: "베트남", CN: "중국", PH: "필리핀", ID: "인도네시아",
  TH: "태국", MM: "미얀마", KH: "캄보디아", OTHER: "기타",
};

const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어", vi: "베트남어", en: "영어", zh: "중국어", th: "태국어",
};

const LEVEL_LABELS: Record<string, string> = {
  NATIVE: "원어민", FLUENT: "유창", INTERMEDIATE: "중급", BASIC: "기초",
};

const LEVEL_COLOR: Record<string, string> = {
  NATIVE: "bg-success-50 text-success-700 border-success-200",
  FLUENT: "bg-primary-50 text-primary-600 border-primary-200",
  INTERMEDIATE: "bg-amber-50 text-amber-700 border-amber-200",
  BASIC: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

const PAY_UNIT_LABELS: Record<string, string> = {
  HOURLY: "시급", DAILY: "일급", WEEKLY: "주급", MONTHLY: "월급", LUMP_SUM: "일시불",
};

const HEALTH_CONFIG: Record<string, { className: string; icon: React.ElementType }> = {
  COMPLETED: { className: "bg-success-50 text-success-700 border-success-200", icon: CheckCircle2 },
  NOT_DONE:  { className: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: Clock },
  EXPIRED:   { className: "bg-danger-50 text-danger-600 border-danger-200", icon: AlertCircle },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function formatDate(s?: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function formatPay(min?: number | null, max?: number | null, unit?: string | null): string {
  const u = unit ? PAY_UNIT_LABELS[unit] ?? unit : "";
  if (!min && !max) return "";
  if (min && max) return `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원/${u}`;
  if (min) return `${min.toLocaleString("ko-KR")}원/${u} 이상`;
  return `${max!.toLocaleString("ko-KR")}원/${u} 이하`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-neutral-200", className)} />;
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="h-48 animate-pulse bg-neutral-200" />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-neutral-100 bg-white p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-card-md">
      <div className="flex items-center gap-2 border-b border-neutral-50 px-5 py-4">
        <Icon className="h-4 w-4 text-primary-400" />
        <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Team Leader Chat Sheet ───────────────────────────────────────────────────

function TeamChatSheet({
  workerPublicId,
  workerName,
  onClose,
}: {
  workerPublicId: string;
  workerName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = React.useState<TeamResponse | null>(null);
  const [message, setMessage] = React.useState("");
  const [step, setStep] = React.useState<"select-team" | "compose">("select-team");
  const [chatError, setChatError] = React.useState<string | null>(null);

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["leader-led-teams"],
    queryFn: () => teamsApi.getLeadedTeams(),
    staleTime: 30_000,
  });

  const { data: balance } = useQuery({
    queryKey: ["tl-point-balance"],
    queryFn: () => workerPointsApi.getBalance(),
    staleTime: 30_000,
  });

  const hasBalance = (balance?.balance ?? 0) > 0;

  const openRoomMutation = useMutation({
    mutationFn: () => directChatApi.openRoom(workerPublicId),
    onSuccess: async (room) => {
      if (message.trim()) {
        try {
          await directChatApi.sendMessage(room.publicId, message.trim());
        } catch {
          // message send failure shouldn't block navigation
        }
      }
      router.push(`/chats/direct/${room.publicId}`);
    },
    onError: (err: any) => {
      if (err?.code === "INSUFFICIENT_POINTS") {
        setChatError("포인트 잔액이 부족합니다.");
      } else {
        setChatError(err?.message ?? "채팅 개설에 실패했습니다.");
      }
    },
  });

  function handleSelectTeam(team: TeamResponse) {
    setSelectedTeam(team);
    setMessage(`안녕하세요, ${team.name} 팀장입니다. 저희 팀에 팀원으로 함께하실 의향이 있으신가요? 관심 있으시면 연락 주세요!`);
    setStep("compose");
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl w-full sm:max-w-md overflow-hidden" style={{ maxHeight: "85dvh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              {step === "compose" && (
                <button
                  onClick={() => { setStep("select-team"); setChatError(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-neutral-600" />
                </button>
              )}
              <div>
                <h2 className="text-base font-bold text-neutral-950">
                  {step === "select-team" ? "팀 선택" : "채팅 제안"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {step === "select-team"
                    ? "어느 팀으로 제안할지 선택하세요"
                    : `${workerName}님에게 팀원 제안 메시지 전송`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors">
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>

          {/* Step 1: Team selection */}
          {step === "select-team" && (
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {teamsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
              ) : !teams || teams.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Users className="mb-3 h-10 w-10 text-neutral-200" />
                  <p className="font-semibold text-neutral-700">소속 팀이 없어요</p>
                  <p className="mt-1 text-sm text-neutral-400">팀을 만든 뒤 팀원에게 채팅을 보낼 수 있어요.</p>
                  <Link
                    href="/teams/new"
                    onClick={onClose}
                    className="mt-4 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                  >
                    팀 만들기
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <button
                      key={team.publicId}
                      onClick={() => handleSelectTeam(team)}
                      className="w-full flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-4 text-left hover:border-primary-200 hover:bg-primary-50 transition-colors"
                    >
                      {team.coverImageUrl ? (
                        <img src={team.coverImageUrl} alt={team.name} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-neutral-900 truncate">{team.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          팀원 {team.memberCount}명
                          {team.headcountTarget ? ` / ${team.headcountTarget}명` : ""}
                          {team.introShort ? ` · ${team.introShort}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Compose message */}
          {step === "compose" && selectedTeam && (
            <>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                {/* Selected team */}
                <div className="flex items-center gap-3 rounded-xl bg-primary-50 border border-primary-100 p-3.5">
                  {selectedTeam.coverImageUrl ? (
                    <img src={selectedTeam.coverImageUrl} alt={selectedTeam.name} className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-700 truncate">{selectedTeam.name}</p>
                    <p className="text-xs text-primary-500">팀원 {selectedTeam.memberCount}명</p>
                  </div>
                </div>

                {/* Point balance */}
                <div className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-3 text-sm",
                  hasBalance ? "bg-primary-50 text-primary-700" : "bg-danger-50 text-danger-600"
                )}>
                  <Coins className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium flex-1">잔액 {balance?.balance ?? "…"}P · 채팅 개설 시 1P 차감</span>
                  {!hasBalance && (
                    <Link href="/leader/points" onClick={onClose} className="flex-shrink-0 text-xs font-semibold underline">
                      충전하기
                    </Link>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-700">전달 메시지</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="팀원 제안 메시지를 입력하세요"
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                  />
                  <p className="mt-1 text-xs text-neutral-400">채팅방이 개설되면 이 메시지가 첫 번째 메시지로 전송됩니다.</p>
                </div>

                {chatError && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
                    <span>{chatError}</span>
                    {chatError.includes("포인트") && (
                      <Link href="/leader/points" onClick={onClose} className="flex-shrink-0 text-xs font-semibold underline">충전하기</Link>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-neutral-100 px-5 py-4 flex-shrink-0">
                <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
                  취소
                </button>
                <button
                  onClick={() => openRoomMutation.mutate()}
                  disabled={openRoomMutation.isPending || !hasBalance || !message.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" />
                  {openRoomMutation.isPending ? "개설 중…" : "채팅 보내기"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Profile Content ──────────────────────────────────────────────────────────

function WorkerProfileContent({ profile }: { profile: WorkerPublicProfile }) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [directChatError, setDirectChatError] = React.useState<string | null>(null);
  React.useEffect(() => { setMounted(true); }, []);

  const directOpenMutation = useMutation({
    mutationFn: () => directChatApi.openRoom(profile.publicId),
    onSuccess: (room) => router.push(`/chats/direct/${room.publicId}`),
    onError: (err: any) => {
      setDirectChatError(err?.message ?? "채팅 개설에 실패했습니다.");
    },
  });

  const isTeamLeader = mounted && user?.role === "TEAM_LEADER";
  const isWorker = mounted && user?.role === "WORKER";

  const health = HEALTH_CONFIG[profile.healthCheckStatus] ?? null;
  const HealthIcon = health?.icon ?? Clock;
  const payLabel = formatPay(profile.desiredPayMin, profile.desiredPayMax, profile.desiredPayUnit);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-10">
      {/* ── Hero ── */}
      <div className="-mx-4 sm:-mx-6">
        <div className="relative h-44 w-full bg-gradient-to-br from-primary-500 to-primary-700">
          <div className="absolute bottom-5 left-4 sm:left-6">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={profile.fullName}
                className="h-20 w-20 rounded-full border-4 border-white/30 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-primary-400 text-3xl font-bold text-white shadow-lg">
                {getInitials(profile.fullName)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Name + badges ── */}
      <div className="mt-5 mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h1 className="text-2xl font-extrabold text-neutral-950">{profile.fullName}</h1>
          {profile.isTeamLeader && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-warning-100 px-2.5 py-0.5 text-xs font-semibold text-warning-700">
              <Shield className="h-3 w-3" /> {t("worker.leaderBadge")}
            </span>
          )}
          {!profile.isTeamLeader && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
              <Users className="h-3 w-3" /> {t("worker.memberBadge")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">
            {t(`nationality.${profile.nationality}` as any) ?? NATIONALITY_LABELS[profile.nationality] ?? profile.nationality}
            {profile.visaType && ` · ${profile.visaType}`}
          </span>
          {health && (
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", health.className)}>
              <HealthIcon className="h-3 w-3" />
              {t(`worker.health.${profile.healthCheckStatus}` as any)}
            </span>
          )}
        </div>

        {/* Team leader: team-select → chat invite flow (1P) */}
        {isTeamLeader && (
          <button
            onClick={() => setChatOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            채팅으로 팀원 제안하기 (1P)
          </button>
        )}

        {/* Worker: free direct chat */}
        {isWorker && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => { setDirectChatError(null); directOpenMutation.mutate(); }}
              disabled={directOpenMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" />
              {directOpenMutation.isPending ? "연결 중…" : "채팅하기"}
            </button>
            {directChatError && (
              <p className="rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700 text-center">
                {directChatError}
              </p>
            )}
          </div>
        )}
      </div>

      {chatOpen && (
        <TeamChatSheet
          workerPublicId={profile.publicId}
          workerName={profile.fullName}
          onClose={() => setChatOpen(false)}
        />
      )}

      <div className="space-y-4">
        {/* ── 소개 ── */}
        {profile.bio && (
          <SectionCard title={t("worker.bio")} icon={Globe} empty={!profile.bio}>
            <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">{profile.bio}</p>
          </SectionCard>
        )}

        {/* ── 기본 정보 ── */}
        <SectionCard title={t("worker.basicInfo")} icon={Shield}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="mb-1 text-xs text-neutral-400">{t("worker.nationality")}</p>
              <p className="text-sm font-semibold text-neutral-900">
                {t(`nationality.${profile.nationality}` as any) ?? NATIONALITY_LABELS[profile.nationality] ?? profile.nationality}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-neutral-400">{t("worker.visa")}</p>
              <p className="text-sm font-semibold text-neutral-900">{profile.visaType || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-neutral-400">{t("worker.health")}</p>
              {health ? (
                <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", health.className)}>
                  <HealthIcon className="h-3 w-3" />
                  {t(`worker.health.${profile.healthCheckStatus}` as any)}
                </span>
              ) : <p className="text-sm text-neutral-400">—</p>}
            </div>
            {payLabel && (
              <div>
                <p className="mb-1 text-xs text-neutral-400">{t("worker.desiredPay")}</p>
                <p className="text-sm font-semibold text-neutral-900">{payLabel}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── 언어 능력 ── */}
        <SectionCard
          title={`${t("worker.languages")} (${profile.languages.length})`}
          icon={Languages}
          empty={profile.languages.length === 0}
        >
          <div className="space-y-3">
            {profile.languages.map((lang, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-800">
                  {LANGUAGE_LABELS[lang.code] ?? lang.code}
                </span>
                <span className={cn("rounded-md border px-2.5 py-0.5 text-xs font-semibold", LEVEL_COLOR[lang.level] ?? "bg-neutral-50 text-neutral-500 border-neutral-200")}>
                  {LEVEL_LABELS[lang.level] ?? lang.level}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 자격증 ── */}
        <SectionCard
          title={`${t("worker.certifications")} (${profile.certifications.length})`}
          icon={Award}
          empty={profile.certifications.length === 0}
        >
          <div className="space-y-3">
            {profile.certifications.map((cert, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{cert.name}</p>
                  {cert.issueDate && (
                    <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      취득일: {formatDate(cert.issueDate)}
                    </p>
                  )}
                  {cert.expiryDate && (
                    <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      만료일: {formatDate(cert.expiryDate)}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 보유 장비 ── */}
        <SectionCard
          title={`${t("worker.equipment")} (${profile.equipment.length})`}
          icon={Wrench}
          empty={profile.equipment.length === 0}
        >
          <div className="flex flex-wrap gap-2">
            {profile.equipment.map((eq, i) => (
              <span key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700">
                {equipmentLabel(eq)}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* ── 포트폴리오 ── */}
        <SectionCard
          title={`${t("worker.portfolio")} (${profile.portfolio.length})`}
          icon={Calendar}
          empty={profile.portfolio.length === 0}
        >
          <div className="space-y-4">
            {profile.portfolio.map((item, i) => (
              <div key={i} className="rounded-lg border border-neutral-100 p-4">
                <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                {(item.startDate || item.endDate) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(item.startDate)}
                    {item.endDate ? ` ~ ${formatDate(item.endDate)}` : ""}
                  </p>
                )}
                {item.description && (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
                )}
                {item.imageUrls?.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
        </SectionCard>

        {/* ── 소속 팀 ── */}
        {profile.teamPublicId && (
          <SectionCard title={t("worker.team")} icon={Users}>
            <Link
              href={`/teams/${profile.teamPublicId}`}
              className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3.5 transition-colors hover:bg-primary-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500">
                  {profile.isTeamLeader
                    ? <Shield className="h-5 w-5 text-white" />
                    : <Users className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-primary-700">{profile.teamName}</p>
                  <p className="text-xs text-primary-500">{profile.isTeamLeader ? t("worker.leaderBadge") : t("worker.memberBadge")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary-400" />
            </Link>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function WorkerProfilePage({ id }: { id: string }) {
  const t = useT();
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["worker-profile", id],
    queryFn: () => getWorker(id),
  });

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <AlertCircle className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-base font-bold text-neutral-700">{t("worker.loadError")}</p>
        <Link
          href="/teams"
          className="mt-5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          팀 찾기로
        </Link>
      </div>
    );
  }

  return <WorkerProfileContent profile={profile} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  return (
    <AppLayout>
      {/* Back button bar */}
      <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="#"
            onClick={(e) => { e.preventDefault(); window.history.back(); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <h1 className="text-sm font-bold text-neutral-900">프로필</h1>
        </div>
      </div>

      <WorkerProfilePage id={id} />
    </AppLayout>
  );
}
