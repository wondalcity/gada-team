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
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { teamsApi } from "@/lib/teams-api";
import { applyForJob, type ApplicationType } from "@/lib/applications-api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: { publicId: string; title: string; companyName: string };
  onSuccess?: () => void;
}

type Step = "SELECT_TYPE" | "COVER_LETTER" | "CONFIRM" | "SUCCESS";

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

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepSelectType({
  selected, onSelect, teamName, teamLoading, userRole,
}: {
  selected: ApplicationType | null;
  onSelect: (t: ApplicationType) => void;
  teamName?: string;
  teamLoading: boolean;
  userRole?: string;
}) {
  const t = useT();
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
        description={
          teamLoading ? (
            <span className="inline-block h-3 w-24 animate-pulse rounded bg-neutral-200" />
          ) : teamName ? (
            <span className="font-medium text-neutral-700">{teamName}</span>
          ) : (
            <span>
              {t("apply.noTeam")}{" "}
              <Link href="/teams/new" className="text-primary-500 underline hover:no-underline">
                {t("apply.createTeam")}
              </Link>
            </span>
          )
        }
        selected={selected === "TEAM"}
        disabled={!teamName && !teamLoading}
        onClick={() => { if (teamName) onSelect("TEAM"); }}
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
  const [coverLetter, setCoverLetter] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", "mine"],
    queryFn: () => teamsApi.getMyTeam(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err: any) => {
      if (err?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      applyForJob(job.publicId, {
        applicationType: applicationType!,
        teamPublicId: applicationType === "TEAM" ? team?.publicId : undefined,
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
      setCoverLetter("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (step === "SUCCESS") {
      const t = setTimeout(() => { onClose(); onSuccess?.(); }, 2000);
      return () => clearTimeout(t);
    }
  }, [step, onClose, onSuccess]);

  if (!isOpen) return null;

  const stepTitle: Record<Step, string> = {
    SELECT_TYPE: t("apply.title.selectType"),
    COVER_LETTER: t("apply.title.coverLetter"),
    CONFIRM: t("apply.title.confirm"),
    SUCCESS: t("apply.title.success"),
  };

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
                teamName={team?.name}
                teamLoading={teamLoading}
                userRole={user?.role}
              />
            ) : step === "COVER_LETTER" ? (
              <StepCoverLetter value={coverLetter} onChange={setCoverLetter} />
            ) : (
              <StepConfirm
                job={job}
                applicationType={applicationType!}
                teamName={team?.name}
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
                    onClick={() => {
                      setErrorMsg(null);
                      if (step === "COVER_LETTER") setStep("SELECT_TYPE");
                      else if (step === "CONFIRM") setStep("COVER_LETTER");
                    }}
                    className="flex-1 rounded-md border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {t("apply.prev")}
                  </button>
                )}
                {step === "SELECT_TYPE" && (
                  <button
                    onClick={() => setStep("COVER_LETTER")}
                    disabled={!applicationType}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {t("apply.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {step === "COVER_LETTER" && (
                  <button
                    onClick={() => setStep("CONFIRM")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                  >
                    {t("apply.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {step === "CONFIRM" && (
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
