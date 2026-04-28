"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HardHat,
  Menu,
  X,
  ChevronRight,
  Briefcase,
  Users,
  BookOpen,
  FileText,
  LogOut,
  Building2,
  LayoutDashboard,
  ChevronDown,
  Globe,
  MapPin,
  Coins,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore, type Locale } from "@/store/localeStore";
import { useT } from "@/lib/i18n";

const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "EN",
  vi: "VI",
};

function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
        aria-label="언어 변경"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline text-xs font-semibold">{LOCALE_LABELS[locale]}</span>
        <ChevronDown className="h-3 w-3 text-neutral-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 rounded-lg border border-neutral-200 bg-white p-1 shadow-card-lg z-50">
          {(["ko", "en", "vi"] as Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                locale === loc
                  ? "bg-primary-50 font-semibold text-primary-600"
                  : "text-neutral-700 hover:bg-neutral-50"
              )}
            >
              <span className="text-base leading-none">
                {loc === "ko" ? "🇰🇷" : loc === "en" ? "🇺🇸" : "🇻🇳"}
              </span>
              {loc === "ko" ? "한국어" : loc === "en" ? "English" : "Tiếng Việt"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getNavLinks(role: string | undefined, t: ReturnType<typeof useT>) {
  const PUBLIC_LINKS = [
    { label: t("nav.jobs"), href: "/jobs", icon: Briefcase },
    { label: t("nav.teams"), href: "/teams", icon: Users },
    { label: t("nav.guides"), href: "/guides", icon: BookOpen },
  ];
  const WORKER_LINKS = [
    { label: t("nav.jobs"), href: "/jobs", icon: Briefcase },
    { label: t("nav.teams"), href: "/teams", icon: Users },
    { label: t("nav.guides"), href: "/guides", icon: BookOpen },
    { label: t("nav.applications"), href: "/applications", icon: FileText },
    { label: t("nav.chats"), href: "/chats", icon: MessageCircle },
    { label: t("nav.proposals"), href: "/proposals", icon: FileText },
  ];
  const EMPLOYER_LINKS = [
    { label: t("nav.dashboard"), href: "/employer", icon: LayoutDashboard, exact: true },
    { label: t("nav.company"), href: "/employer/company", icon: Building2 },
    { label: t("nav.sites"), href: "/employer/sites", icon: MapPin },
    { label: t("nav.jobManage"), href: "/employer/jobs", icon: Briefcase },
    { label: t("nav.applicants"), href: "/employer/applicants", icon: Users },
    { label: t("nav.teams"), href: "/employer/teams", icon: Users },
    { label: t("nav.chats"), href: "/employer/chats", icon: MessageCircle },
  ];
  const ADMIN_LINKS = [
    { label: t("nav.jobs"), href: "/jobs", icon: Briefcase },
    { label: t("nav.adminDashboard"), href: "http://localhost:3001/dashboard", icon: LayoutDashboard, external: true },
  ];

  switch (role) {
    case "WORKER":
    case "TEAM_LEADER":
      return WORKER_LINKS;
    case "EMPLOYER":
      return EMPLOYER_LINKS;
    case "ADMIN":
      return ADMIN_LINKS;
    default:
      return PUBLIC_LINKS;
  }
}

export function TopNav({ variant = "white" }: { variant?: "transparent" | "white" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const t = useT();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navLinks = getNavLinks(user?.role, t);

  const roleLabelMap: Record<string, string> = {
    WORKER: t("role.worker"),
    TEAM_LEADER: t("role.teamLeader"),
    EMPLOYER: t("role.employer"),
    ADMIN: t("role.admin"),
  };
  const getRoleLabel = (role: string) => roleLabelMap[role] ?? role;

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gada_dev_user_id");
    }
    clear();
    router.push("/login");
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-150",
          variant === "transparent" && !scrolled
            ? "bg-transparent"
            : "bg-white border-b border-neutral-200",
          scrolled && "shadow-card"
        )}
      >
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-neutral-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-500">
              <HardHat className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg tracking-tight">
              GADA<span className="text-primary-500">.</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => {
              const isActive =
                !("external" in link && link.external) &&
                ("exact" in link && link.exact
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(link.href + "/"));
              if ("external" in link && link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  >
                    {link.label}
                    <span className="text-[10px] font-semibold text-warning-700 bg-warning-50 px-1.5 py-0.5 rounded">{t("nav.admin")}</span>
                  </a>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary-500 bg-primary-50"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth area */}
          <div className="flex items-center gap-1.5">
            <LocaleSwitcher />
            {user ? (
              <>
                <NotificationBell />
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="hidden sm:flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                      {user.role.charAt(0)}
                    </span>
                    <span className="max-w-[80px] truncate text-neutral-700">{getRoleLabel(user.role)}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-card-lg">
                      <div className="px-3 py-2.5 mb-0.5">
                        <p className="text-xs font-semibold text-neutral-900">{getRoleLabel(user.role)}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{user.phone}</p>
                      </div>
                      <div className="border-t border-neutral-100 pt-1">
                        {user.role === "WORKER" || user.role === "TEAM_LEADER" ? (
                          <Link
                            href="/profile"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >
                            {t("nav.myProfile")}
                          </Link>
                        ) : user.role === "EMPLOYER" ? (
                          <>
                            <Link
                              href="/employer"
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <LayoutDashboard className="h-3.5 w-3.5 text-neutral-400" />
                              {t("nav.dashboard")}
                            </Link>
                            <div className="my-0.5 border-t border-neutral-100" />
                            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("nav.employerProfile")}</p>
                            <Link
                              href="/employer/points"
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Coins className="h-3.5 w-3.5 text-primary-400" />
                              {t("nav.chargePoints")}
                            </Link>
                            <Link
                              href="/employer/payments"
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                              {t("nav.paymentHistory")}
                            </Link>
                          </>
                        ) : user.role === "ADMIN" ? (
                          <a
                            href="http://localhost:3001/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >
                            {t("nav.adminDashboard")}
                          </a>
                        ) : null}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger-500 hover:bg-danger-50 transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          {t("nav.logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <NotificationBell />
                <Link
                  href="/login"
                  className="hidden px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors sm:block"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/login"
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  <span className="hidden sm:inline">{t("nav.start")}</span>
                  <span className="sm:hidden">{t("nav.login")}</span>
                </Link>
              </>
            )}
            <button
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={t("nav.menu")}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-neutral-900/20 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="fixed left-0 right-0 top-14 z-50 border-b border-neutral-200 bg-white shadow-card-lg md:hidden">
            <nav className="px-4 py-3">
              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-3 border border-neutral-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
                    {user.role.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{getRoleLabel(user.role)}</p>
                    <p className="text-xs text-neutral-500">{user.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    !("external" in link && link.external) &&
                    ("exact" in link && link.exact
                      ? pathname === link.href
                      : pathname === link.href || pathname.startsWith(link.href + "/"));
                  if ("external" in link && link.external) {
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-neutral-400" />
                          {link.label}
                        </span>
                        <span className="text-[10px] font-semibold text-warning-700 bg-warning-50 px-1.5 py-0.5 rounded">{t("nav.admin")}</span>
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-600"
                          : "text-neutral-700 hover:bg-neutral-50"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4", isActive ? "text-primary-500" : "text-neutral-400")} />
                        {link.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </Link>
                  );
                })}
              </div>
              {user?.role === "EMPLOYER" && (
                <div className="mt-2 border-t border-neutral-100 pt-2">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t("nav.employerProfile")}</p>
                  <Link
                    href="/employer/points"
                    className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Coins className="h-4 w-4 text-primary-400" />
                      {t("nav.chargePoints")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-neutral-300" />
                  </Link>
                  <Link
                    href="/employer/payments"
                    className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-neutral-400" />
                      {t("nav.paymentHistory")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-neutral-300" />
                  </Link>
                </div>
              )}
              <div className="mt-2 border-t border-neutral-100 pt-2">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-danger-500 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.logout")}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {t("nav.loginStart")}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
