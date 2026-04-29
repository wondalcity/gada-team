"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAdminUserId, clearAdminSession } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  HardHat,
  Building2,
  MapPin,
  Briefcase,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  Menu,
  LogOut,
  Shield,
  Search,
  BookOpen,
  HelpCircle,
  MessageSquare,
  ClipboardList,
  ScrollText,
  UserCog,
  List,
  SendHorizontal,
  Coins,
} from "lucide-react";
import { cn } from "@gada/ui";

// ─── Navigation structure ─────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: "대시보드", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "인력 관리",
    items: [
      { label: "근로자", href: "/workers", icon: HardHat },
      { label: "팀", href: "/teams", icon: Users },
      { label: "관리자", href: "/employers", icon: Building2 },
    ],
  },
  {
    title: "회사 정보",
    items: [
      { label: "건설사", href: "/companies", icon: Shield },
    ],
  },
  {
    title: "현장 관리",
    items: [
      { label: "현장 목록", href: "/sites", icon: MapPin },
    ],
  },
  {
    title: "공고 관리",
    items: [
      { label: "채용공고", href: "/jobs", icon: Briefcase },
      { label: "지원 관리", href: "/applications", icon: ClipboardList },
      { label: "계약 관리", href: "/contracts", icon: ScrollText },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { label: "콘텐츠 관리", href: "/content", icon: BookOpen },
      { label: "알림 관리", href: "/notifications", icon: Bell },
      { label: "SMS 템플릿", href: "/sms-templates", icon: MessageSquare },
    ],
  },
  {
    title: "SMS/알림",
    items: [
      { label: "SMS 발송 내역", href: "/sms-logs", icon: List },
      { label: "발송 도구", href: "/sms-send", icon: SendHorizontal },
    ],
  },
  {
    title: "포인트",
    items: [
      { label: "충전 요청 관리", href: "/points", icon: Coins },
    ],
  },
  {
    title: "설정",
    items: [
      { label: "관리자 권한", href: "/settings/admins", icon: UserCog },
    ],
  },
];

// ─── Sidebar NavItem ──────────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-brand-blue text-white shadow-sm"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          isActive
            ? "text-white"
            : "text-neutral-500 group-hover:text-neutral-700"
        )}
        aria-hidden
      />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {!collapsed && item.badge && item.badge > 0 ? (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold",
            isActive
              ? "bg-white/25 text-white"
              : "bg-brand-blue-50 text-brand-blue"
          )}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 z-50 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white group-hover:block shadow-lg">
          {item.label}
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────

function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-neutral-950/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-white border-r border-neutral-100",
          "transition-all duration-300 ease-in-out",
          // Mobile: slides in
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: collapsed or expanded
          collapsed ? "w-[64px]" : "w-[240px]"
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            "flex h-[56px] flex-shrink-0 items-center border-b border-neutral-100 px-4",
            collapsed ? "justify-center" : "justify-between gap-2"
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue">
                <HardHat className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold tracking-tight text-neutral-950 leading-none">
                  GADA<span className="text-brand-blue">.</span>
                </div>
                <div className="text-[10px] font-medium text-neutral-400 mt-0.5">
                  Admin Console
                </div>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link
              href="/dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue"
            >
              <HardHat className="h-4 w-4 text-white" />
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors shrink-0",
              collapsed && "mx-auto"
            )}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className={cn("px-3", sIdx > 0 && "mt-1")}>
              {section.title && !collapsed && (
                <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {section.title}
                </p>
              )}
              {section.title && collapsed && sIdx > 0 && (
                <div className="my-2 mx-1 h-px bg-neutral-100" />
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: settings + user */}
        <div className="flex-shrink-0 border-t border-neutral-100 p-3 space-y-0.5">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "설정" : undefined}
          >
            <Settings className="h-[18px] w-[18px] shrink-0 text-neutral-500" />
            {!collapsed && "설정"}
          </Link>

          {/* User pill */}
          <div
            className={cn(
              "mt-1 flex items-center gap-2.5 rounded-xl border border-neutral-100 bg-neutral-50 p-2.5",
              collapsed && "justify-center border-0 bg-transparent p-0"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-blue">관</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  관리자
                </p>
                <p className="text-[10px] text-neutral-500 truncate">
                  admin@gada.kr
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => {
                  clearAdminSession();
                  window.location.href = "/login";
                }}
                className="h-7 w-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── TopBar ───────────────────────────────────────────────────

function TopBar({
  collapsed,
  onMobileMenuOpen,
  title,
  breadcrumbs,
  actions,
}: {
  collapsed: boolean;
  onMobileMenuOpen: () => void;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 h-[56px] flex items-center gap-3 px-4 bg-white/95 backdrop-blur-sm border-b border-neutral-100",
        "transition-all duration-300 ease-in-out",
        collapsed ? "left-[64px]" : "left-[240px]",
        // Mobile: full width
        "max-lg:left-0"
      )}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs / Title */}
      <div className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <li className="text-neutral-300 select-none">/</li>
                  )}
                  <li>
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className={cn(
                          idx < breadcrumbs.length - 1
                            ? "text-neutral-500 hover:text-neutral-800 transition-colors"
                            : "font-semibold text-neutral-900"
                        )}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          idx < breadcrumbs.length - 1
                            ? "text-neutral-500"
                            : "font-semibold text-neutral-900"
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                </React.Fragment>
              ))}
            </ol>
          </nav>
        ) : title ? (
          <h1 className="text-sm font-bold text-neutral-950 truncate">{title}</h1>
        ) : null}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Global search */}
        <button className="hidden sm:flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-4 text-sm text-neutral-500 hover:border-neutral-300 hover:bg-white transition-colors">
          <Search className="h-3.5 w-3.5" />
          <span>검색...</span>
          <kbd className="ml-1 hidden rounded border border-neutral-200 bg-white px-1 text-[10px] font-medium text-neutral-400 md:inline-flex">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-blue" />
        </button>

        {/* Extra actions slot */}
        {actions}
      </div>
    </header>
  );
}

// ─── AdminLayout ──────────────────────────────────────────────

export interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function AdminLayout({
  children,
  title,
  breadcrumbs,
  actions,
}: AdminLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Auth guard + role validation
  React.useEffect(() => {
    const userId = getAdminUserId();
    if (!userId) {
      router.replace("/login");
      return;
    }
    // Verify the stored userId is actually an ADMIN.
    // Always use relative URL so it goes through the Next.js rewrite proxy.
    fetch(`/api/v1/auth/me`, {
      headers: { "Content-Type": "application/json", "X-Dev-User-Id": userId },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.role !== "ADMIN") {
          localStorage.removeItem("gada_admin_user_id");
          router.replace("/login");
        }
      })
      .catch(() => {
        // 네트워크 오류 시 localStorage는 유지 (재시도 가능하게)
        console.warn("Auth check failed — network error");
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <TopBar
        collapsed={sidebarCollapsed}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
        title={title}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      <main
        className={cn(
          "min-h-screen pt-[56px] transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-[64px]" : "lg:pl-[240px]"
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
