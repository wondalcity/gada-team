"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ChevronRight, Building2 } from "lucide-react";
import { workerChatApi, WorkerChatRoomSummary } from "@/lib/chat-api";
import { AppLayout } from "@/components/layout/AppLayout";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RoomSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/5 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}

// ─── Room Row ──────────────────────────────────────────────────────────────────

function RoomRow({ room }: { room: WorkerChatRoomSummary }) {
  const t = useT();
  return (
    <Link
      href={`/chats/${room.publicId}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors"
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
          <Building2 className="h-6 w-6 text-success-600" />
        </div>
        {room.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white">
            {room.unreadCount > 9 ? "9+" : room.unreadCount}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm font-semibold", room.unreadCount > 0 ? "text-neutral-950" : "text-neutral-800")}>
            {room.employerName ?? t("chats.employer")}
          </span>
          <span className="flex-shrink-0 text-xs text-neutral-400">
            {formatTime(room.lastMessageAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-400">{room.teamName ?? ""}</p>
        <p className={cn("mt-0.5 truncate text-sm", room.unreadCount > 0 ? "font-medium text-neutral-700" : "text-neutral-400")}>
          {room.lastMessagePreview ?? ""}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkerChatsPage() {
  const t = useT();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["worker-chats"],
    queryFn: () => workerChatApi.listRooms(0, 50),
    refetchInterval: 15000,
  });

  const rooms = data?.content ?? [];

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-neutral-950">{t("chats.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("chats.sub")}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-card-md divide-y divide-neutral-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <RoomSkeleton key={i} />)
          ) : isError ? (
            <div className="flex flex-col items-center py-16 text-center px-4">
              <MessageCircle className="mb-3 h-10 w-10 text-neutral-200" />
              <p className="text-sm text-neutral-500">{t("chats.loadError")}</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-4">
              <MessageCircle className="mb-3 h-10 w-10 text-neutral-200" />
              <p className="font-semibold text-neutral-700">{t("chats.empty")}</p>
              <p className="mt-1 text-sm text-neutral-400">{t("chats.emptySub")}</p>
            </div>
          ) : (
            rooms.map((room) => <RoomRow key={room.publicId} room={room} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
}
