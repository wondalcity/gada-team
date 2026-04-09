"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Users, FileText, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getMyNotifications } from "@/lib/notifications-api";
import { useT } from "@/lib/i18n";

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useT();

  const TABS = [
    { label: t("bottom.home"), href: "/", icon: Home, exactMatch: true },
    { label: t("bottom.jobs"), href: "/jobs", icon: Search },
    { label: t("bottom.teams"), href: "/teams", icon: Users },
    { label: t("bottom.applications"), href: "/applications", icon: FileText },
    { label: t("bottom.notifications"), href: "/notifications", icon: Bell },
    { label: t("bottom.profile"), href: "/profile", icon: User },
  ];

  const { data: notifData } = useQuery({
    queryKey: ["notificationUnread"],
    queryFn: () => getMyNotifications(0),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exactMatch
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const showBadge = tab.href === "/notifications" && unreadCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                isActive ? "text-primary-500" : "text-neutral-400"
              )}
            >
              <span className="relative">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-danger-500 px-0.5 text-[8px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
