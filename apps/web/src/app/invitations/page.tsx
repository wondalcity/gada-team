"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Check, X, Clock, Users, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, InvitationResponse } from "@/lib/teams-api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function InvitationCardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-card animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-neutral-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-neutral-200" />
          <div className="h-3 w-1/3 rounded bg-neutral-100" />
          <div className="h-3 w-1/4 rounded bg-neutral-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-16 rounded-lg bg-neutral-200" />
          <div className="h-9 w-16 rounded-lg bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMessage {
  id: number;
  type: "success" | "error";
  message: string;
}

function Toast({
  toast,
  onClose,
}: {
  toast: ToastMessage;
  onClose: (id: number) => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 2500);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium shadow-card-xl animate-fade-in",
        toast.type === "success"
          ? "bg-neutral-900 text-white"
          : "bg-danger-700 text-white"
      )}
    >
      {toast.type === "success" ? (
        <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

// ─── Invitation Card ──────────────────────────────────────────────────────────

interface InvitationCardProps {
  invitation: InvitationResponse;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  acceptLoading: boolean;
  rejectLoading: boolean;
}

function InvitationCard({
  invitation,
  onAccept,
  onReject,
  acceptLoading,
  rejectLoading,
}: InvitationCardProps) {
  const t = useT();
  const isPending = invitation.status === "PENDING";
  const isAccepted = invitation.status === "ACCEPTED";
  const isRejected = invitation.status === "REJECTED";

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 shadow-card-md transition-all",
        isPending ? "border-neutral-100" : "border-neutral-100 opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Team cover / avatar */}
        <div className="flex-shrink-0">
          {invitation.teamCoverImageUrl ? (
            <img
              src={invitation.teamCoverImageUrl}
              alt={invitation.teamName}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-xl font-extrabold text-white">
              {getInitials(invitation.teamName)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900 leading-tight">
            {invitation.teamName}
          </p>
          {invitation.invitedByName && (
            <p className="mt-0.5 text-xs text-neutral-500">
              <span className="font-medium text-neutral-600">
                {invitation.invitedByName}
              </span>
              {t("invite.invited")}
            </p>
          )}
          {invitation.invitedAt && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
              <Clock className="h-3 w-3" />
              {formatDate(invitation.invitedAt)}
            </p>
          )}

          {/* Status chip when not pending */}
          {isAccepted && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
              <Check className="h-3 w-3" />
              {t("invite.accepted")}
            </span>
          )}
          {isRejected && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
              <X className="h-3 w-3" />
              {t("invite.rejected")}
            </span>
          )}
        </div>

        {/* Action buttons — only for pending */}
        {isPending && (
          <div className="flex flex-shrink-0 flex-col gap-1.5 sm:flex-row">
            <button
              onClick={() => onAccept(invitation.invitationId)}
              disabled={acceptLoading || rejectLoading}
              className="flex min-h-[40px] min-w-[60px] items-center justify-center rounded-lg bg-success-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-success-700 disabled:opacity-50 active:scale-[0.97]"
            >
              {acceptLoading ? "..." : t("invite.accept")}
            </button>
            <button
              onClick={() => onReject(invitation.invitationId)}
              disabled={acceptLoading || rejectLoading}
              className="flex min-h-[40px] min-w-[60px] items-center justify-center rounded-lg border border-danger-200 bg-white px-3 py-2 text-xs font-bold text-danger-500 transition-all hover:bg-danger-50 disabled:opacity-50 active:scale-[0.97]"
            >
              {rejectLoading ? "..." : t("invite.reject")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function InvitationsContent() {
  const t = useT();
  const queryClient = useQueryClient();
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const [pendingAction, setPendingAction] = React.useState<{
    id: number;
    type: "accept" | "reject";
  } | null>(null);

  const addToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["invitations", "mine"],
    queryFn: () => teamsApi.getMyInvitations(),
    initialData: [],
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => teamsApi.acceptInvitation(id),
    onMutate: (id) => setPendingAction({ id, type: "accept" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["team", "mine"] });
      addToast("success", t("invite.acceptedToast"));
    },
    onError: (err: any) => {
      addToast("error", err?.message || t("invite.acceptFailed"));
    },
    onSettled: () => setPendingAction(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => teamsApi.rejectInvitation(id),
    onMutate: (id) => setPendingAction({ id, type: "reject" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "mine"] });
      addToast("success", t("invite.rejectedToast"));
    },
    onError: (err: any) => {
      addToast("error", err?.message || t("invite.rejectFailed"));
    },
    onSettled: () => setPendingAction(null),
  });

  const pending = invitations?.filter((inv) => inv.status === "PENDING") ?? [];
  const other = invitations?.filter((inv) => inv.status !== "PENDING") ?? [];

  return (
    <>
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-neutral-950">{t("invite.title")}</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {t("invite.sub")}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <InvitationCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && invitations?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
              <Mail className="h-9 w-9 text-neutral-300" />
            </div>
            <p className="text-base font-bold text-neutral-700">
              {t("invite.empty")}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {t("invite.emptySub")}
            </p>
          </div>
        )}

        {/* Pending invitations */}
        {!isLoading && pending.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-neutral-800">
                {t("invite.pending")}
              </span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-bold text-white">
                {pending.length}
              </span>
            </div>
            {pending.map((inv) => (
              <InvitationCard
                key={inv.invitationId}
                invitation={inv}
                onAccept={(id) => acceptMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
                acceptLoading={
                  pendingAction?.id === inv.invitationId &&
                  pendingAction.type === "accept"
                }
                rejectLoading={
                  pendingAction?.id === inv.invitationId &&
                  pendingAction.type === "reject"
                }
              />
            ))}
          </div>
        )}

        {/* Past invitations */}
        {!isLoading && other.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-neutral-400">{t("invite.processed")}</p>
            {other.map((inv) => (
              <InvitationCard
                key={inv.invitationId}
                invitation={inv}
                onAccept={() => {}}
                onReject={() => {}}
                acceptLoading={false}
                rejectLoading={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex flex-col gap-2 items-center">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvitationsPage() {
  return (
    <AppLayout>
      <InvitationsContent />
    </AppLayout>
  );
}
