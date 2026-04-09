"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMyNotifications } from "@/lib/notifications-api";

export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notificationUnread"],
    queryFn: () => getMyNotifications(0),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const unread = data?.unreadCount ?? 0;
  const label = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `알림 ${label}개` : "알림"}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors"
    >
      <Bell className="h-5 w-5" />
      {label && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-0.5 text-[9px] font-bold leading-none text-white">
          {label}
        </span>
      )}
    </Link>
  );
}
