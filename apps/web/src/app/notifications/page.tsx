"use client";

import * as React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  Bell,
  FileText,
  Star,
  RefreshCw,
  Megaphone,
  CheckCheck,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type WorkerNotification,
  type NotificationType,
} from "@/lib/notifications-api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useAuthStore } from "@/store/authStore";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  APPLICATION: {
    icon: FileText,
    color: "text-primary-600",
    bg: "bg-primary-50",
  },
  SCOUT: {
    icon: Star,
    color: "text-warning-700",
    bg: "bg-warning-50",
  },
  STATUS_CHANGE: {
    icon: RefreshCw,
    color: "text-secondary-600",
    bg: "bg-secondary-50",
  },
  SYSTEM: {
    icon: Bell,
    color: "text-neutral-600",
    bg: "bg-neutral-100",
  },
  MARKETING: {
    icon: Megaphone,
    color: "text-primary-600",
    bg: "bg-primary-50",
  },
  CHAT: {
    icon: MessageCircle,
    color: "text-primary-600",
    bg: "bg-primary-50",
  },
};

/** Resolve a deep-link href from notification type + data */
function resolveHref(notification: WorkerNotification): string | null {
  const d = notification.data as Record<string, string>;
  switch (notification.type) {
    case "SCOUT":
      return "/proposals";
    case "APPLICATION":
    case "STATUS_CHANGE":
      return "/applications";
    case "CHAT":
      if (d?.chatType === "direct" && d?.chatRoomId) {
        return `/chats/direct/${d.chatRoomId}`;
      }
      if (d?.chatRoomId) {
        return `/chats/${d.chatRoomId}`;
      }
      return "/chats";
    default:
      return null;
  }
}

// ─── Date grouping ────────────────────────────────────────────────────────────

type DateGroup = "today" | "yesterday" | "thisWeek" | "older";

function getDateGroup(iso: string): DateGroup {
  const now = new Date();
  const d = new Date(iso);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const startOfWeek = new Date(startOfToday.getTime() - (now.getDay() || 7) * 86_400_000);

  if (d >= startOfToday) return "today";
  if (d >= startOfYesterday) return "yesterday";
  if (d >= startOfWeek) return "thisWeek";
  return "older";
}

const DATE_GROUP_ORDER: DateGroup[] = ["today", "yesterday", "thisWeek", "older"];

function groupNotifications(
  notifications: WorkerNotification[]
): Array<{ group: DateGroup; items: WorkerNotification[] }> {
  const map = new Map<DateGroup, WorkerNotification[]>();

  for (const n of notifications) {
    const group = getDateGroup(n.createdAt);
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(n);
  }

  return DATE_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    group: g,
    items: map.get(g)!,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string, t: ReturnType<typeof useT>): string {
  const now = Date.now();
  const d = new Date(iso).getTime();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return t("notif.justNow");
  if (diff < 3600) return t("notif.minutesAgo", Math.floor(diff / 60));
  if (diff < 86400) return t("notif.hoursAgo", Math.floor(diff / 3600));

  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-neutral-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-1/2 rounded bg-neutral-200" />
            <div className="h-2 w-2 rounded-full bg-neutral-200" />
          </div>
          <div className="h-3 w-4/5 rounded bg-neutral-100" />
          <div className="h-3 w-3/5 rounded bg-neutral-100" />
          <div className="h-2.5 w-16 rounded bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Notification card ────────────────────────────────────────────────────────

function NotificationCard({
  notification,
  onRead,
}: {
  notification: WorkerNotification;
  onRead: (publicId: string) => void;
}) {
  const t = useT();
  const router = useRouter();
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.SYSTEM;
  const Icon = cfg.icon;
  const href = resolveHref(notification);

  function handleClick() {
    if (!notification.isRead) onRead(notification.publicId);
    if (href) router.push(href);
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full rounded-lg p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        notification.isRead
          ? "bg-neutral-100"
          : "border-l-2 border-primary-200 bg-white",
        href && "cursor-pointer"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
            cfg.bg
          )}
        >
          <Icon className={cn("h-4 w-4", cfg.color)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                notification.isRead ? "text-neutral-500" : "text-neutral-950"
              )}
            >
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
            )}
          </div>

          {/* Body */}
          <p
            className={cn(
              "mt-0.5 text-sm leading-snug",
              notification.isRead ? "text-neutral-400" : "text-neutral-600"
            )}
          >
            {notification.body}
          </p>

          {/* Time */}
          <p className="mt-1.5 text-xs text-neutral-400">
            {formatRelativeTime(notification.createdAt, t)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-100 bg-white py-24 text-center">
      <Bell className="mb-4 h-12 w-12 text-neutral-300" />
      <p className="text-base font-bold text-neutral-700">{t("notif.empty")}</p>
      <p className="mt-1.5 text-sm text-neutral-500">
        {t("notif.emptySub")}
      </p>
    </div>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function NotificationsContent() {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["myNotifications"],
      queryFn: ({ pageParam = 0 }) => getMyNotifications(pageParam as number),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        const nextPage = lastPage.page + 1;
        return nextPage < lastPage.totalPages ? nextPage : undefined;
      },
      enabled: mounted && !!user,
    });

  const allNotifications = data?.pages.flatMap((p) => p.content) ?? [];
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const grouped = groupNotifications(allNotifications);

  const GROUP_LABELS: Record<DateGroup, string> = {
    today: t("notif.today"),
    yesterday: t("notif.yesterday"),
    thisWeek: t("notif.thisWeek"),
    older: t("notif.older"),
  };

  // ── Mark single as read (optimistic) ──
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (publicId) => {
      await queryClient.cancelQueries({ queryKey: ["myNotifications"] });
      const prev = queryClient.getQueryData(["myNotifications"]);

      queryClient.setQueryData<typeof data>(["myNotifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            unreadCount: Math.max(0, page.unreadCount - 1),
            content: page.content.map((n) =>
              n.publicId === publicId
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n
            ),
          })),
        };
      });

      // also update the unread bell query
      queryClient.setQueryData<typeof data>(["notificationUnread"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            unreadCount: Math.max(0, page.unreadCount - 1),
          })),
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["myNotifications"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnread"] });
    },
  });

  // ── Mark all as read (optimistic) ──
  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["myNotifications"] });
      const prev = queryClient.getQueryData(["myNotifications"]);

      queryClient.setQueryData<typeof data>(["myNotifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            unreadCount: 0,
            content: page.content.map((n) => ({
              ...n,
              isRead: true,
              readAt: n.readAt ?? new Date().toISOString(),
            })),
          })),
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["myNotifications"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnread"] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">{t("notif.title")}</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-neutral-500">
              {t("notif.unread", unreadCount)}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            {t("notif.markAll")}
          </button>
        )}
      </div>

      {/* Before mount: skeleton to avoid hydration mismatch */}
      {!mounted ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : !user ? (
        /* Guest state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-100 bg-white py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <Bell className="h-8 w-8 text-neutral-400" />
          </div>
          <p className="text-base font-bold text-neutral-700">{t("notif.loginRequired")}</p>
          <p className="mt-1.5 text-sm text-neutral-500">{t("notif.loginRequiredSub")}</p>
          <Link
            href="/login"
            className="mt-6 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {t("notif.loginBtn")}
          </Link>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-neutral-100 bg-white p-10 text-center">
          <p className="text-sm text-neutral-500">
            {t("common.error")}. {t("common.retry")}
          </p>
        </div>
      ) : allNotifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              {/* Date group header */}
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 py-2">
                {GROUP_LABELS[group]}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((n) => (
                  <NotificationCard
                    key={n.publicId}
                    notification={n}
                    onRead={(id) => readMutation.mutate(id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isFetchingNextPage ? `${t("notif.loading")}...` : t("notif.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  return (
    <AppLayout>
      <NotificationsContent />
    </AppLayout>
  );
}
