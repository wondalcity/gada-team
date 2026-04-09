"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { JobCard, JobCardSkeleton } from "@/components/jobs/JobCard";
import { getCategoryDetail, getCategoryJobs } from "@/lib/content-api";
import type { FaqItem, PricingNote, ContentSection, SkillEntry } from "@/lib/content-api";
import { useLocaleStore } from "@/store/localeStore";
import { GUIDE_STRINGS } from "@/lib/guides-i18n";

const CODE_EMOJI: Record<string, string> = {
  CONCRETE: "🏗️",
  REBAR: "🔩",
  FORM: "🪵",
  MASONRY: "🧱",
  TILE: "🟦",
  PLUMBING: "🔧",
  ELECTRICAL: "⚡",
  PAINTING: "🎨",
  SCAFFOLD: "🏚️",
  WATERPROOF: "💧",
  CRANE: "🏗️",
  EXCAVATOR: "🚜",
  WELDER: "🔥",
  INTERIOR: "🛋️",
  GENERAL: "👷",
};

const PAY_TYPE_LABEL: Record<string, string> = {
  DAILY: "일당",
  HOURLY: "시급",
  MONTHLY: "월급",
};

const SKILL_LEVEL_CLASS: Record<string, string> = {
  필수: "bg-danger-100 text-danger-700 border border-danger-200",
  권장: "bg-primary-100 text-primary-700 border border-primary-200",
  고급: "bg-secondary-100 text-secondary-600 border border-secondary-200",
  선택: "bg-neutral-100 text-neutral-600 border border-neutral-200",
};

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 rounded-full bg-primary-500 flex-shrink-0" />
      <h2 className="text-lg font-bold uppercase tracking-wide text-neutral-800">
        {children}
      </h2>
    </div>
  );
}

// ─── FAQ Accordion Item ───────────────────────────────────────────────────────

function FaqAccordion({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-neutral-100 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-neutral-800 text-sm leading-snug pr-4">
          {faq.question}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-primary-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400 flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-5 pt-3 bg-neutral-100 border-t border-neutral-200">
          <p className="text-sm text-neutral-600 leading-relaxed">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sticky TOC ───────────────────────────────────────────────────────────────

function StickyToc({ activeId, tocItems, tocLabel }: { activeId: string; tocItems: Record<string, string>; tocLabel: string }) {
  const items = Object.entries(tocItems).map(([id, label]) => ({ id, label }));
  return (
    <aside className="hidden xl:block w-52 flex-shrink-0">
      <div className="sticky top-6">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 px-3">
          {tocLabel}
        </p>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeId === item.id
                  ? "bg-primary-50 text-primary-600"
                  : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ─── Hero skeleton ────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full h-72 md:h-96 animate-pulse bg-neutral-100" />
  );
}

// ─── Body skeleton ────────────────────────────────────────────────────────────

function BodySkeleton() {
  return (
    <div className="space-y-4 max-w-3xl">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`h-4 animate-pulse rounded bg-neutral-100 ${
            i % 3 === 2 ? "w-3/4" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Work Characteristics ─────────────────────────────────────────────────────

function CharacteristicsSection({ items, label }: { items: ContentSection[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <section id="characteristics" className="scroll-mt-20 mb-12">
      <SectionHeading>{label}</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-primary-50 border border-primary-200 rounded-lg p-5"
          >
            <h3 className="font-bold text-neutral-800 mb-1.5 text-sm">{item.title}</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Related Skills ───────────────────────────────────────────────────────────

function SkillsSection({ skills, label }: { skills: SkillEntry[]; label: string }) {
  if (skills.length === 0) return null;
  return (
    <section id="skills" className="scroll-mt-20 mb-12">
      <SectionHeading>{label}</SectionHeading>
      <div className="flex flex-wrap gap-2.5">
        {skills.map((skill, i) => {
          const levelClass =
            SKILL_LEVEL_CLASS[skill.level] ?? "bg-neutral-100 text-neutral-600 border border-neutral-200";
          return (
            <span key={i} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${levelClass}`}>
              {skill.name}
              <span className="text-[10px] font-semibold opacity-75">{skill.level}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection({ notes, label, noteText }: { notes: PricingNote[]; label: string; noteText: string }) {
  if (notes.length === 0) return null;
  return (
    <section id="pricing" className="scroll-mt-20 mb-12">
      <SectionHeading>{label}</SectionHeading>
      <div className="flex flex-col gap-3">
        {notes.map((note, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100">
              <span className="text-xs font-bold text-primary-700">
                {PAY_TYPE_LABEL[note.type] ?? note.type}
              </span>
            </div>
            <div>
              <p className="font-bold text-neutral-800 text-sm">
                {note.minAmount.toLocaleString("ko-KR")}원 ~{" "}
                {note.maxAmount.toLocaleString("ko-KR")}원
              </p>
              {note.note && (
                <p className="text-xs text-neutral-500 mt-0.5">{note.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        {noteText}
      </p>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FaqSection({ faqs, label }: { faqs: FaqItem[]; label: string }) {
  if (faqs.length === 0) return null;
  const published = faqs.filter((f) => f.isPublished);
  if (published.length === 0) return null;
  return (
    <section id="faq" className="scroll-mt-20 mb-12">
      <SectionHeading>{label}</SectionHeading>
      <div className="flex flex-col gap-2">
        {published
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((faq) => (
            <FaqAccordion key={faq.publicId} faq={faq} />
          ))}
      </div>
    </section>
  );
}

// ─── Related Jobs ─────────────────────────────────────────────────────────────

function RelatedJobsSection({ code, relatedJobsLabel, viewMoreLabel, noJobsLabel }: {
  code: string;
  relatedJobsLabel: string;
  viewMoreLabel: string;
  noJobsLabel: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["categoryJobs", code],
    queryFn: () => getCategoryJobs(code),
  });

  const jobs = data?.content ?? [];

  return (
    <section className="border-t border-neutral-200 bg-neutral-100 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-neutral-900">{relatedJobsLabel}</h2>
          <Link
            href={`/jobs`}
            className="text-sm font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            {viewMoreLabel}
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-neutral-100 bg-white py-12 text-center">
            <p className="text-sm text-neutral-500">{noJobsLabel}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 min-w-max sm:min-w-0">
              {jobs.slice(0, 6).map((job) => (
                <div key={job.publicId} className="w-72 sm:w-auto flex-shrink-0 sm:flex-shrink">
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function GuideDetailContent() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const locale = useLocaleStore((s) => s.locale);
  const t = GUIDE_STRINGS[locale];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categoryDetail", code, locale],
    queryFn: () => getCategoryDetail(code, locale),
    enabled: !!code,
  });

  // Intersection observer for active TOC item
  const [activeId, setActiveId] = React.useState("intro");

  React.useEffect(() => {
    const ids = Object.keys(t.tocItems);
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [data]);

  const emoji = CODE_EMOJI[code] ?? "🏗️";

  // ── Loading state ──
  if (isLoading) {
    return (
      <>
        <HeroSkeleton />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <BodySkeleton />
        </div>
      </>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-base font-bold text-neutral-700 mb-2">
          {t.loadError}
        </p>
        <p className="text-sm text-neutral-500 mb-6">{t.loadErrorSub}</p>
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToList}
        </Link>
      </div>
    );
  }

  const content = data?.content ?? null;
  const faqs = data?.faqs ?? [];
  const categoryName = data
    ? (locale === "en" && data.nameEn ? data.nameEn : locale === "vi" && data.nameVi ? data.nameVi : data.nameKo)
    : code;

  // ── No content state ──
  if (!content) {
    return (
      <>
        {/* Simple fallback hero */}
        <div className="bg-gradient-to-br from-neutral-800 to-neutral-950 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="mb-8 flex items-center gap-2">
              <Link
                href="/guides"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.backToGuides}
              </Link>
              <span className="text-white/30 text-xs">/</span>
              <span className="text-xs text-white/50">{categoryName}</span>
            </div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
              <span>{emoji}</span>
              {categoryName}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {categoryName}
            </h1>
            <p className="text-lg text-white/60">{t.preparing}</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-8 text-center max-w-lg mx-auto">
            <BookOpen className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-neutral-800 mb-2">
              {t.noContent}
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
              {t.preparingDesc(categoryName)}
            </p>
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.otherGuides}
            </Link>
          </div>
        </div>

        <RelatedJobsSection
          code={code}
          relatedJobsLabel={t.relatedJobs}
          viewMoreLabel={t.viewMore}
          noJobsLabel={t.noJobs}
        />
      </>
    );
  }

  const hasChars = content.workCharacteristics?.length > 0;
  const hasSkills = content.relatedSkills?.length > 0;
  const hasPricing =
    content.pricingNotes != null && content.pricingNotes.length > 0;
  const hasFaqs = faqs.length > 0;

  return (
    <>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        {content.heroImageUrl ? (
          <>
            <img
              src={content.heroImageUrl}
              alt={content.title}
              className="w-full h-72 md:h-[480px] object-cover"
            />
            {/* Strong gradient so breadcrumb + text are always legible */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-900/60 to-neutral-900/20" />
          </>
        ) : (
          <div className="w-full h-72 md:h-[480px] bg-gradient-to-br from-neutral-800 to-neutral-950" />
        )}

        {/* Hero content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
            {/* Breadcrumb back link */}
            <div className="mb-5 flex items-center gap-2">
              <Link
                href="/guides"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm hover:bg-white/20 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.backToGuides}
              </Link>
              <span className="text-white/30 text-xs">/</span>
              <span className="text-xs text-white/50">{categoryName}</span>
            </div>

            {/* Category badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm border border-white/20">
              <span>{emoji}</span>
              {categoryName}
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-3 max-w-3xl">
              {content.title}
            </h1>

            {/* Subtitle + reading time */}
            <div className="flex flex-wrap items-center gap-4">
              {content.subtitle && (
                <p className="text-base text-white/60">{content.subtitle}</p>
              )}
              {content.readingTimeMin && (
                <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
                  <Clock className="h-3.5 w-3.5" />
                  {t.readingTime(content.readingTimeMin)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Article body ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start gap-10">
          {/* Sticky TOC sidebar */}
          <StickyToc activeId={activeId} tocItems={t.tocItems} tocLabel={t.toc} />

          {/* Main article */}
          <div className="min-w-0 flex-1">
            {/* Body prose */}
            <section id="intro" className="scroll-mt-20 mb-12">
              <div className="prose prose-base max-w-3xl text-neutral-700 leading-relaxed text-base md:text-lg">
                {content.body.split("\n\n").map((para, i) =>
                  para.trim() ? (
                    <p key={i} className="mb-5 text-neutral-700 leading-relaxed text-base md:text-lg">
                      {para.trim()}
                    </p>
                  ) : null
                )}
              </div>
            </section>

            {/* Content images */}
            {content.contentImages?.length > 0 && (
              <div className="mb-12 flex flex-col gap-4">
                {content.contentImages.map((img, i) => (
                  <figure key={i} className="rounded-lg overflow-hidden border border-neutral-200">
                    <img
                      src={img.url}
                      alt={img.caption ?? ""}
                      className="w-full object-cover max-h-72"
                    />
                    {img.caption && (
                      <figcaption className="bg-neutral-100 px-4 py-2 text-xs text-neutral-500">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            {hasChars && (
              <CharacteristicsSection items={content.workCharacteristics} label={t.characteristics} />
            )}

            {hasSkills && <SkillsSection skills={content.relatedSkills} label={t.skills} />}

            {hasPricing && (
              <PricingSection notes={content.pricingNotes!} label={t.pricing} noteText={t.pricingNote} />
            )}

            {hasFaqs && <FaqSection faqs={faqs} label={t.faq} />}
          </div>
        </div>
      </div>

      {/* ── Related Jobs ── */}
      <RelatedJobsSection
        code={code}
        relatedJobsLabel={t.relatedJobs}
        viewMoreLabel={t.viewMore}
        noJobsLabel={t.noJobs}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuideDetailPage() {
  return (
    <AppLayout topNavVariant="transparent" showBottomNav={true}>
      <React.Suspense
        fallback={
          <>
            <HeroSkeleton />
            <div className="mx-auto max-w-7xl px-4 py-10">
              <BodySkeleton />
            </div>
          </>
        }
      >
        <GuideDetailContent />
      </React.Suspense>
    </AppLayout>
  );
}
