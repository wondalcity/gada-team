"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Users,
  Building2,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { teamsApi, type TeamResponse } from "@/lib/teams-api";
import { applyForJob, type ApplicationType } from "@/lib/applications-api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: { publicId: string; title: string; companyName: string };
  onSuccess?: () => void;
}

type Step = "SELECT_TYPE" | "SELECT_TEAM" | "COVER_LETTER" | "CONFIRM" | "SUCCESS";

const MAX_COVER_LETTER = 500;

// ─── Type card ────────────────────────────────────────────────────────────────

interface TypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TypeCard({ icon, title, description, selected, disabled, onClick }: TypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
        selected
          ? "border-primary-300 bg-primary-50"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
        selected ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", selected ? "text-primary-700" : "text-neutral-900")}>
          {title}
        </p>
        <div className="mt-0.5 text-xs text-neutral-500">{description}</div>
      </div>
      {selected && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary-500" />}
    </button>
  );
}

// ─── Team selection card ───────────────────────────────────────────────────────

function TeamCard({
  team,
  selected,
  onClick,
}: {
  team: TeamResponse;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
        selected
          ? "border-primary-300 bg-primary-50"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
        selected ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500"
      )}>
        {team.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold truncate", selected ? "text-primary-700" : "text-neutral-900")}>
          {team.name}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
          <Users className="h-3 w-3" />
          {t("apply.teamMemberCount").replace("{n}", String(team.memberCount ?? 0))}
          {team.teamType === "COMPANY_LINKED" && (
            <span className="ml-1 rounded bg-secondary-100 px-1 py-0.5 text-secondary-600 text-[10px] font-semibold">
              기업
            </span>
          )}
        </p>
      </div>
      {selected && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary-500" />}
    </button>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepSelectType({
  selected, onSelect, ledTeams, teamLoading, userRole,
}: {
  selected: ApplicationType | null;
  onSelect: (t: ApplicationType) => void;
  ledTeams: TeamResponse[];
  teamLoading: boolean;
  userRole?: string;
}) {
  const t = useT();
  const hasTeam = ledTeams.length > 0;
  const multipleTeams = ledTeams.length > 1;

  const teamDescription = teamLoading ? (
    <span className="inline-block h-3 w-24 animate-pulse rounded bg-neutral-200" />
  ) : hasTeam ? (
    multipleTeams ? (
      <span className="font-medium text-neutral-700">
        {`팀 ${ledTeams.length}개 · `}
        <span className="text-primary-500">{t("apply.teamMultipleDesc")}</span>
      </span>
    ) : (
      <span className="font-medium text-neutral-700">{ledTeams[0].name}</span>
    )
  ) : (
    <span>
      {t("apply.noTeam")}{" "}
      <Link href="/teams/new" className="text-primary-500 underline hover:no-underline">
        {t("apply.createTeam")}
      </Link>
    </span>
  );

  return (
    <div className="space-y-2.5">
      <TypeCard
        icon={<User className="h-5 w-5" />}
        title={t("apply.individual")}
        description={t("apply.individualDesc")}
        selected={selected === "INDIVIDUAL"}
        onClick={() => onSelect("INDIVIDUAL")}
      />
      <TypeCard
        icon={<Users className="h-5 w-5" />}
        title={t("apply.team")}
        description={teamDescription}
        selected={selected === "TEAM"}
        disabled={!hasTeam && !teamLoading}
        onClick={() => { if (hasTeam) onSelect("TEAM"); }}
      />
      {userRole === "EMPLOYER" && (
        <TypeCard
          icon={<Building2 className="h-5 w-5" />}
          title={t("apply.company")}
          description={t("apply.companyDesc")}
          selected={selected === "COMPANY"}
          onClick={() => onSelect("COMPANY")}
        />
      )}
    </div>
  );
}

function StepSelectTeam({
  ledTeams,
  selectedPublicId,
  onSelect,
}: {
  ledTeams: TeamResponse[];
  selectedPublicId: string | null;
  onSelect: (publicId: string) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-2">
      <p className="mb-3 text-sm text-neutral-500">{t("apply.selectTeamDesc")}</p>
      {ledTeams.map((team) => (
        <TeamCard
          key={team.publicId}
          team={team}
          selected={selectedPublicId === team.publicId}
          onClick={() => onSelect(team.publicId)}
        />
      ))}
    </div>
  );
}

function StepCoverLetter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-700">
        {t("apply.coverLetter")} <span className="text-xs font-normal text-neutral-400">({t("apply.optional")})</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => { if (e.target.value.length <= MAX_COVER_LETTER) onChange(e.target.value); }}
        placeholder={t("apply.coverLetterPlaceholder")}
        rows={7}
        className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
      />
      <p className="mt-1.5 text-right text-xs text-neutral-400">
        <span className={value.length >= MAX_COVER_LETTER ? "text-danger-500" : ""}>
          {value.length}
        </span>{" "}
        / {MAX_COVER_LETTER}
      </p>
    </div>
  );
}

function StepConfirm({
  job, applicationType, teamName, coverLetter,
}: {
  job: { title: string; companyName: string };
  applicationType: ApplicationType;
  teamName?: string;
  coverLetter: string;
}) {
  const t = useT();
  const typeLabel: Record<ApplicationType, string> = {
    INDIVIDUAL: t("apply.individual"),
    TEAM: t("apply.team"),
    COMPANY: t("apply.company"),
  };
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
      <Row label={t("apply.job")} value={job.title} />
      <Row label={t("apply.company_")} value={job.companyName} />
      <Row label={t("apply.appType")} value={typeLabel[applicationType]} />
      {applicationType === "TEAM" && teamName && <Row label={t("apply.teamName")} value={teamName} />}
      {coverLetter ? (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">{t("apply.coverLetter")}</p>
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-700">{coverLetter}</p>
        </div>
      ) : (
        <Row label={t("apply.coverLetter")} value={t("apply.noCoverLetter")} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 flex-shrink-0 pt-0.5 text-xs font-medium text-neutral-400">{label}</span>
      <span className="text-sm font-medium text-neutral-800">{value}</span>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function ApplyModal({ isOpen, onClose, job, onSuccess }: ApplyModalProps) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = React.useState<Step>("SELECT_TYPE");
  const [applicationType, setApplicationType] = React.useState<ApplicationType | null>(null);
  const [selectedTeamPublicId, setSelectedTeamPublicId] = React.useState<string | null>(null);
  const [coverLetter, setCoverLetter] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch all teams the user leads (not just /teams/mine which returns any membership)
  const { data: ledTeams = [], isLoading: teamLoading } = useQuery({
    queryKey: ["teams", "led-by-me"],
    queryFn: () => teamsApi.getLeadedTeams(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err: any) => {
      if (err?.status === 404) return false;
      return failureCount < 2;
    },
    enabled: isOpen,
  });

  const selectedTeam = ledTeams.find((t) => t.publicId === selectedTeamPublicId);

  const applyMutation = useMutation({
    mutationFn: () =>
      applyForJob(job.publicId, {
        applicationType: applicationType!,
        teamPublicId: applicationType === "TEAM" ? selectedTeamPublicId ?? undefined : undefined,
        coverLetter: coverLetter || undefined,
      }),
    onSuccess: () => setStep("SUCCESS"),
    onError: (err: any) => {
      setErrorMsg(err?.message || t("apply.errorDefault"));
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      setStep("SELECT_TYPE");
      setApplicationType(null);
      setSelectedTeamPublicId(null);
      setCoverLetter("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Auto-select when only one team
  React.useEffect(() => {
    if (ledTeams.length === 1 && !selectedTeamPublicId) {
      setSelectedTeamPublicId(ledTeams[0].publicId);
    }
  }, [ledTeams, selectedTeamPublicId]);

  React.useEffect(() => {
    if (step === "SUCCESS") {
      const timer = setTimeout(() => { onClose(); onSuccess?.(); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, onClose, onSuccess]);

  if (!isOpen) return null;

  const multipleTeams = ledTeams.length > 1;

  // Step title mapping
  const stepTitle: Record<Step, string> = {
    SELECT_TYPE: t("apply.title.selectType"),
    SELECT_TEAM: t("apply.title.selectTeam"),
    COVER_LETTER: t("apply.title.coverLetter"),
    CONFIRM: t("apply.title.confirm"),
    SUCCESS: t("apply.title.success"),
  };

  function handleNext() {
    if (step === "SELECT_TYPE") {
      if (applicationType === "TEAM" && multipleTeams) {
        setStep("SELECT_TEAM");
      } else {
        setStep("COVER_LETTER");
      }
    } else if (step === "SELECT_TEAM") {
      setStep("COVER_LETTER");
    } else if (step === "COVER_LETTER") {
      setStep("CONFIRM");
    }
  }

  function handleBack() {
    setErrorMsg(null);
    if (step === "SELECT_TEAM") {
      setStep("SELECT_TYPE");
    } else if (step === "COVER_LETTER") {
      if (applicationType === "TEAM" && multipleTeams) {
        setStep("SELECT_TEAM");
      } else {
        setStep("SELECT_TYPE");
      }
    } else if (step === "CONFIRM") {
      setStep("COVER_LETTER");
    }
  }

  const canProceed =
    step === "SELECT_TYPE" ? !!applicationType :
    step === "SELECT_TEAM" ? !!selectedTeamPublicId :
    true;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-neutral-900/40"
        onClick={step !== "SUCCESS" ? onClose : undefined}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="flex w-full max-h-[90vh] flex-col rounded-t-xl bg-white shadow-card-xl sm:mx-4 sm:max-w-lg sm:rounded-lg">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div>
              <p className="text-xs font-medium text-primary-500">{job.companyName}</p>
              <h2 className="mt-0.5 line-clamp-1 text-base font-semibold text-neutral-900">
                {step === "SUCCESS" ? t("apply.title.success") : stepTitle[step]}
              </h2>
            </div>
            {step !== "SUCCESS" && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {step === "SUCCESS" ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-100">
                  <CheckCircle2 className="h-7 w-7 text-success-700" />
                </div>
                <p className="font-display text-lg font-semibold text-neutral-900">{t("apply.successTitle")}</p>
                <p className="mt-2 text-sm text-neutral-500">
                  {job.title}{t("apply.successSub1")}<br />{t("apply.successSub2")}
                </p>
              </div>
            ) : step === "SELECT_TYPE" ? (
              <StepSelectType
                selected={applicationType}
                onSelect={setApplicationType}
                ledTeams={ledTeams}
                teamLoading={teamLoading}
                userRole={user?.role}
              />
            ) : step === "SELECT_TEAM" ? (
              <StepSelectTeam
                ledTeams={ledTeams}
                selectedPublicId={selectedTeamPublicId}
                onSelect={setSelectedTeamPublicId}
              />
            ) : step === "COVER_LETTER" ? (
              <StepCoverLetter value={coverLetter} onChange={setCoverLetter} />
            ) : (
              <StepConfirm
                job={job}
                applicationType={applicationType!}
                teamName={selectedTeam?.name}
                coverLetter={coverLetter}
              />
            )}
            {errorMsg && step === "CONFIRM" && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-500">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== "SUCCESS" && (
            <div className="flex-shrink-0 border-t border-neutral-100 px-5 py-4">
              <div className={cn("flex gap-2", step !== "SELECT_TYPE" && "flex-row")}>
                {step !== "SELECT_TYPE" && (
                  <button
                    onClick={handleBack}
                    className="flex-1 rounded-md border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {t("apply.prev")}
                  </button>
                )}
                {step === "CONFIRM" ? (
                  <button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {applyMutation.isPending ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        {t("apply.loading")}
                      </>
                    ) : t("apply.submit")}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors",
                      step === "SELECT_TYPE" ? "w-full" : "flex-1"
                    )}
                  >
                    {t("apply.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
