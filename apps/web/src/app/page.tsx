"use client";

import Link from "next/link";
import {
  HardHat,
  Users,
  Building2,
  MapPin,
  Shield,
  Clock,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Phone,
  Zap,
  Globe,
  Award,
  Search,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import { FeaturedJobs } from "@/components/jobs/FeaturedJobs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useT } from "@/lib/i18n";

// ─── Data ─────────────────────────────────────────────────────────────────────

const JOB_CATEGORIES = [
  "콘크리트공", "철근공", "거푸집공", "조적공", "타일공",
  "배관공", "전기공", "도장공", "비계공", "방수공",
  "크레인 기사", "굴삭기 기사", "용접공", "인테리어공", "일반 노무",
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const t = useT();

  const STATS = [
    { value: "12,000+", label: t("home.stat.workers") },
    { value: "3,400+", label: t("home.stat.jobs") },
    { value: "820+", label: t("home.stat.companies") },
    { value: "98%", label: t("home.stat.satisfaction") },
  ];

  const FEATURES = [
    {
      icon: MapPin,
      title: t("home.feat.location.title"),
      description: t("home.feat.location.desc"),
      iconColor: "text-primary-500",
      iconBg: "bg-primary-50",
    },
    {
      icon: Users,
      title: t("home.feat.team.title"),
      description: t("home.feat.team.desc"),
      iconColor: "text-success-700",
      iconBg: "bg-success-50",
    },
    {
      icon: Shield,
      title: t("home.feat.cert.title"),
      description: t("home.feat.cert.desc"),
      iconColor: "text-secondary-500",
      iconBg: "bg-secondary-50",
    },
    {
      icon: Zap,
      title: t("home.feat.scout.title"),
      description: t("home.feat.scout.desc"),
      iconColor: "text-warning-700",
      iconBg: "bg-warning-50",
    },
    {
      icon: Globe,
      title: t("home.feat.lang.title"),
      description: t("home.feat.lang.desc"),
      iconColor: "text-danger-500",
      iconBg: "bg-danger-50",
    },
    {
      icon: Award,
      title: t("home.feat.guide.title"),
      description: t("home.feat.guide.desc"),
      iconColor: "text-success-700",
      iconBg: "bg-success-50",
    },
  ];

  const ROLES = [
    {
      subtitle: "Worker",
      title: t("home.roles.worker.title"),
      description: t("home.roles.worker.desc"),
      icon: HardHat,
      cta: t("home.roles.worker.cta"),
      href: "/login?role=worker",
      points: [
        t("home.roles.worker.f1"),
        t("home.roles.worker.f2"),
        t("home.roles.worker.f3"),
        t("home.roles.worker.f4"),
      ],
      accent: "text-primary-500",
      border: "border-primary-200",
      bg: "bg-primary-50",
    },
    {
      subtitle: "Employer",
      title: t("home.roles.employer.title"),
      description: t("home.roles.employer.desc"),
      icon: Building2,
      cta: t("home.roles.employer.cta"),
      href: "/login?role=employer",
      points: [
        t("home.roles.employer.f1"),
        t("home.roles.employer.f2"),
        t("home.roles.employer.f3"),
        t("home.roles.employer.f4"),
      ],
      accent: "text-neutral-700",
      border: "border-neutral-200",
      bg: "bg-neutral-50",
    },
  ];

  const HOW_IT_WORKS = [
    {
      step: "01",
      title: t("home.howto.s1"),
      description: t("home.howto.s1desc"),
      icon: Search,
    },
    {
      step: "02",
      title: t("home.howto.s2"),
      description: t("home.howto.s2desc"),
      icon: FileCheck,
    },
    {
      step: "03",
      title: t("home.howto.s3"),
      description: t("home.howto.s3desc"),
      icon: TrendingUp,
    },
  ];

  return (
    <AppLayout topNavVariant="white">
      <div className="min-h-screen bg-white">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-neutral-800">
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80&auto=format&fit=crop"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-neutral-950/65" />
          {/* Content */}
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 mb-6 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                {t("home.footer.platform")}
              </span>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t("home.heroTitle")}
                <br />
                <span className="text-primary-400">{t("home.heroTitle2")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
                {t("home.heroSub")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  {t("home.viewJobs")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  {t("home.startNow")}
                  <ChevronRight className="h-4 w-4 text-white/60" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="border-b border-neutral-100 bg-neutral-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-3xl font-bold text-neutral-900 sm:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Jobs ── */}
        <FeaturedJobs />

        {/* ── How it works ── */}
        <section className="border-b border-neutral-100 bg-neutral-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {t("home.howto.title")}
              </h2>
              <p className="mt-3 text-neutral-500">
                {t("home.howto.sub")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="relative">
                    {idx < HOW_IT_WORKS.length - 1 && (
                      <div
                        aria-hidden
                        className="absolute left-full top-8 hidden h-px w-6 bg-neutral-200 sm:block"
                      />
                    )}
                    <div className="rounded-lg border border-neutral-200 bg-white p-6">
                      <p className="mb-4 text-xs font-semibold text-primary-500">STEP {step.step}</p>
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                        <Icon className="h-5 w-5 text-primary-500" />
                      </div>
                      <h3 className="mb-2 font-display text-base font-semibold text-neutral-900">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-neutral-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="border-b border-neutral-100 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {t("home.features.title")}
              </h2>
              <p className="mt-3 text-neutral-500">
                {t("home.features.sub")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-lg border border-neutral-200 bg-white p-6 hover:border-neutral-300 transition-colors"
                  >
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${feature.iconBg}`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <h3 className="mb-2 font-display text-sm font-semibold text-neutral-900">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-500">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Role cards ── */}
        <section className="border-b border-neutral-100 bg-neutral-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {t("home.roles.title")}
              </h2>
              <p className="mt-3 text-neutral-500">
                {t("home.roles.sub")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.title}
                    className={`rounded-lg border bg-white p-8 ${role.border}`}
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <p className={`mb-1 text-xs font-semibold uppercase tracking-widest ${role.accent}`}>
                          {role.subtitle}
                        </p>
                        <h3 className="font-display text-2xl font-bold text-neutral-900">
                          {role.title}
                        </h3>
                      </div>
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${role.bg}`}>
                        <Icon className={`h-5 w-5 ${role.accent}`} />
                      </div>
                    </div>
                    <p className="mb-6 text-sm leading-relaxed text-neutral-500">
                      {role.description}
                    </p>
                    <ul className="mb-8 space-y-2.5">
                      {role.points.map((point) => (
                        <li key={point} className="flex items-center gap-2.5 text-sm text-neutral-700">
                          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${role.accent}`} />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={role.href}
                      className={`inline-flex items-center gap-2 text-sm font-semibold ${role.accent} hover:gap-3 transition-all`}
                    >
                      {role.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Job categories ── */}
        <section className="border-b border-neutral-100 bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                {t("home.byJobs")}
              </h2>
              <Link
                href="/jobs"
                className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
              >
                {t("common.loadMore")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  href={`/jobs?category=${encodeURIComponent(cat)}`}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-primary-500 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              {t("home.cta.title")}
            </h2>
            <p className="mt-4 text-base text-primary-100">
              {t("home.cta.sub")}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3 text-sm font-semibold text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Phone className="h-4 w-4" />
                {t("home.cta.register")}
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                {t("home.cta.browse")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-neutral-200 bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
              <div className="max-w-xs">
                <Link href="/" className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
                    <HardHat className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-display text-base font-bold text-neutral-900">
                    가다<span className="text-primary-500 font-black"> Team</span>
                  </span>
                </Link>
                <p className="text-sm leading-relaxed text-neutral-400">
                  {t("home.footer.platform")}
                  <br />
                  근로자, 팀, 기업 모두를 위한 가다 Team.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
                <div>
                  <h4 className="mb-3 font-semibold text-neutral-700">{t("home.footer.service")}</h4>
                  <ul className="space-y-2 text-neutral-400">
                    <li><Link href="/jobs" className="hover:text-neutral-700 transition-colors">{t("home.footer.jobs")}</Link></li>
                    <li><Link href="/teams" className="hover:text-neutral-700 transition-colors">{t("home.footer.teams")}</Link></li>
                    <li><Link href="/guides" className="hover:text-neutral-700 transition-colors">{t("home.footer.guides")}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 font-semibold text-neutral-700">{t("home.footer.company")}</h4>
                  <ul className="space-y-2 text-neutral-400">
                    <li><Link href="/employer" className="hover:text-neutral-700 transition-colors">{t("home.footer.hire")}</Link></li>
                    <li><Link href="/login?role=employer" className="hover:text-neutral-700 transition-colors">{t("home.footer.post")}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 font-semibold text-neutral-700">{t("home.footer.support")}</h4>
                  <ul className="space-y-2 text-neutral-400">
                    <li><span className="cursor-default">{t("home.footer.help")}</span></li>
                    <li><Link href="/terms" className="hover:text-neutral-700 transition-colors">{t("home.footer.terms")}</Link></li>
                    <li><Link href="/privacy" className="hover:text-neutral-700 transition-colors">{t("home.footer.privacy")}</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-6 sm:flex-row">
              <p className="text-xs text-neutral-400">© 2025 GADA Inc. All rights reserved.</p>
              <p className="text-xs text-neutral-300">대표: 홍길동 | 사업자등록번호: 000-00-00000</p>
            </div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
