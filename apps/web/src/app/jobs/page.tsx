"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Briefcase, SlidersHorizontal, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { JobCard, JobCardSkeleton } from "@/components/jobs/JobCard";
import {
  JobFiltersSidebar,
  countActiveFilters,
} from "@/components/jobs/JobFilters";
import { FilterDrawer } from "@/components/jobs/FilterDrawer";
import { useJobs, useCategories } from "@/hooks/useJobs";
import { filterFromParams, filterToSearchParams } from "@/lib/jobs-api";
import type { JobSummary, JobsFilter } from "@/lib/jobs-api";
import { useT } from "@/lib/i18n";

type SortKey = "latest" | "pay" | "distance";

function sortJobs(jobs: JobSummary[], sortKey: SortKey): JobSummary[] {
  if (sortKey === "pay") {
    return [...jobs].sort((a, b) => (b.payMax ?? b.payMin ?? 0) - (a.payMax ?? a.payMin ?? 0));
  }
  if (sortKey === "distance") {
    return [...jobs].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  return [...jobs].sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime()
  );
}

function JobsContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filter, setFilter] = React.useState<JobsFilter>(() => filterFromParams(searchParams));
  const [sortKey, setSortKey] = React.useState<SortKey>("latest");
  const [allJobs, setAllJobs] = React.useState<JobSummary[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [showFilterDrawer, setShowFilterDrawer] = React.useState(false);

  const { data: categories } = useCategories();

  React.useEffect(() => {
    const params = filterToSearchParams(filter);
    router.replace(`/jobs?${params.toString()}`, { scroll: false });
    setAllJobs([]);
    setCurrentPage(0);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isFetching, isError } = useJobs({ ...filter, page: currentPage });

  React.useEffect(() => {
    if (data?.content) {
      if (currentPage === 0) {
        setAllJobs(data.content);
      } else {
        setAllJobs((prev) => [...prev, ...data.content]);
      }
    }
  }, [data, currentPage]);

  const handleFilterChange = (newFilter: JobsFilter) => {
    setFilter({ ...newFilter, page: 0, size: filter.size });
  };

  const handleLoadMore = () => setCurrentPage((p) => p + 1);

  const hasLocation = filter.lat != null && filter.lng != null;
  const activeCount = countActiveFilters(filter);
  const sortedJobs = sortJobs(allJobs, sortKey);
  const hasMore = data ? !data.isLast : false;
  const totalElements = data?.totalElements ?? 0;
  const isLoading = isFetching && currentPage === 0 && allJobs.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">{t("jobs.title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("jobs.sub")}</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder={t("jobs.searchPlaceholder")}
          value={filter.keyword ?? ""}
          onChange={(e) => handleFilterChange({ ...filter, keyword: e.target.value || undefined })}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {/* Mobile filter button */}
      <div className="mb-6 flex items-center gap-2 lg:hidden">
        <button
          onClick={() => setShowFilterDrawer(true)}
          className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("common.filter")}
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
        {hasLocation && filter.radius && (
          <span className="flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600">
            <MapPin className="h-3 w-3" />
            {t("jobs.nearMe") + " " + filter.radius + t("jobs.km")}
          </span>
        )}
      </div>

      <div className="flex items-start gap-6">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <JobFiltersSidebar value={filter} onChange={handleFilterChange} />
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Results bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-neutral-500">
                {isLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-neutral-200" />
                ) : (
                  <>
                    {t("jobs.totalJobs" as any, totalElements)}
                    {activeCount > 0 && (
                      <span className="ml-2 text-primary-500">
                        ({t("jobs.filterApplied" as any, activeCount)})
                      </span>
                    )}
                  </>
                )}
              </p>
              {hasLocation && filter.radius && (
                <span className="hidden lg:flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
                  <MapPin className="h-3 w-3" />
                  {t("jobs.nearMe") + " " + filter.radius + t("jobs.km")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
              {(
                [
                  { value: "latest", label: t("jobs.sortRecent") },
                  { value: "pay", label: t("jobs.sortPay") },
                  ...(hasLocation ? [{ value: "distance", label: t("jobs.sortDistance") }] : []),
                ] as { value: SortKey; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortKey(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                    sortKey === opt.value
                      ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200"
                      : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white py-20 text-center">
              <Briefcase className="mb-4 h-10 w-10 text-neutral-300" />
              <p className="font-medium text-neutral-700">{t("jobs.loadError")}</p>
              <p className="mt-1 text-sm text-neutral-400">{t("common.retry")}</p>
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white py-20 text-center">
              <Search className="mb-4 h-10 w-10 text-neutral-300" />
              <p className="font-medium text-neutral-700">{t("jobs.noResults")}</p>
              <p className="mt-1 text-sm text-neutral-400">{t("jobs.noResultsSub")}</p>
              <button
                onClick={() => handleFilterChange({ page: 0, size: filter.size })}
                className="mt-5 rounded-md bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                {t("jobs.resetFilter")}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sortedJobs.map((job) => <JobCard key={job.publicId} job={job} />)}
              </div>
              {(hasMore || (isFetching && currentPage > 0)) && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-8 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-300 transition-colors disabled:opacity-60"
                  >
                    {isFetching ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-500" />
                        {t("jobs.loadingMore") + "..."}
                      </>
                    ) : t("jobs.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        filter={filter}
        onApply={handleFilterChange}
        categories={categories ?? []}
      />
    </div>
  );
}

export default function JobsPage() {
  return (
    <AppLayout>
      <React.Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          </div>
        }
      >
        <JobsContent />
      </React.Suspense>
    </AppLayout>
  );
}
