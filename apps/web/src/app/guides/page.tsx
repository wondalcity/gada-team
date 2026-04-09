"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCategories } from "@/lib/content-api";
import type { CategoryListItem } from "@/lib/content-api";
import { useLocaleStore } from "@/store/localeStore";
import { GUIDE_STRINGS, getCategoryName } from "@/lib/guides-i18n";

const CODE_EMOJI: Record<string, string> = {
  CONCRETE: "🏗️", REBAR: "🔩", FORM: "🪵", MASONRY: "🧱", TILE: "🟦",
  PLUMBING: "🔧", ELECTRICAL: "⚡", PAINTING: "🎨", SCAFFOLD: "🏚️",
  WATERPROOF: "💧", CRANE: "🏗️", EXCAVATOR: "🚜", WELDER: "🔥",
  INTERIOR: "🛋️", GENERAL: "👷",
};

const CODE_COLORS: Record<string, string> = {
  CONCRETE: "from-slate-700 to-slate-900",
  REBAR: "from-zinc-600 to-zinc-900",
  FORM: "from-amber-700 to-amber-900",
  MASONRY: "from-stone-600 to-stone-900",
  TILE: "from-sky-600 to-sky-900",
  PLUMBING: "from-blue-700 to-blue-900",
  ELECTRICAL: "from-yellow-500 to-orange-700",
  PAINTING: "from-pink-500 to-rose-700",
  SCAFFOLD: "from-neutral-500 to-neutral-800",
  WATERPROOF: "from-cyan-600 to-cyan-900",
  CRANE: "from-orange-600 to-neutral-800",
  EXCAVATOR: "from-yellow-600 to-yellow-900",
  WELDER: "from-red-600 to-red-900",
  INTERIOR: "from-purple-500 to-purple-900",
  GENERAL: "from-primary-600 to-primary-900",
};

function getEmoji(code: string): string {
  return CODE_EMOJI[code] ?? "🏗️";
}

function getGradient(code: string): string {
  return CODE_COLORS[code] ?? "from-neutral-600 to-neutral-900";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CategoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="h-28 animate-pulse bg-neutral-100" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/5 animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
        <div className="mt-4 h-8 w-28 animate-pulse rounded-md bg-neutral-100" />
      </div>
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ category }: { category: CategoryListItem }) {
  const locale = useLocaleStore((s) => s.locale);
  const t = GUIDE_STRINGS[locale];
  const name = getCategoryName(category, locale);
  const emoji = getEmoji(category.code);
  const gradient = getGradient(category.code);
  const hasContent = category.hasContent;

  return (
    <div className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all hover:border-neutral-300 hover:shadow-card-md">
      {/* Colored header */}
      <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="select-none text-5xl" role="img" aria-label={name}>{emoji}</span>
        <div className="absolute right-3 top-3">
          {hasContent ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              {t.guideAvailable}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/60">
              {t.comingSoon}
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h2 className="mb-2 font-display text-base font-semibold text-neutral-900 leading-snug">{name}</h2>
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-neutral-400">
          {category.description ?? `${name}`}
        </p>
        {hasContent ? (
          <Link
            href={`/guides/${category.code}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            {t.readGuide}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed select-none items-center rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-400">
            {t.preparing}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function GuidesContent() {
  const locale = useLocaleStore((s) => s.locale);
  const t = GUIDE_STRINGS[locale];

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["categories", locale],
    queryFn: () => getCategories(locale),
  });

  return (
    <>
      {/* Hero */}
      <div className="bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-white/50">
              {t.typeGuide}
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl mb-3">
            {t.heroTitle}
          </h1>
          <p className="max-w-2xl text-base text-white/50">
            {t.heroSub}
          </p>
        </div>
      </div>

      {/* Category grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white py-24 text-center">
            <BookOpen className="mb-4 h-10 w-10 text-neutral-300" />
            <p className="font-medium text-neutral-700">{t.loadError}</p>
            <p className="mt-1 text-sm text-neutral-400">{t.loadErrorSub}</p>
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white py-24 text-center">
            <BookOpen className="mb-4 h-10 w-10 text-neutral-300" />
            <p className="font-medium text-neutral-700">{t.noJobs}</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-neutral-500">
              {t.countLabel(categories.length, categories.filter((c) => c.hasContent).length)}
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <CategoryCard key={cat.publicId} category={cat} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function GuidesPage() {
  return (
    <AppLayout topNavVariant="white">
      <GuidesContent />
    </AppLayout>
  );
}
