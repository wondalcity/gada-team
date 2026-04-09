"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { JobCard, JobCardSkeleton } from "./JobCard";
import { useT } from "@/lib/i18n";

export function FeaturedJobs() {
  const t = useT();
  const { data, isLoading } = useJobs({ size: 4, page: 0 });

  if (!isLoading && (!data || data.content.length === 0)) return null;

  return (
    <section className="border-b border-neutral-100 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-neutral-900">
              {t("jobs.title")}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {t("jobs.sub")}
            </p>
          </div>
          <Link
            href="/jobs"
            className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            {t("common.loadMore")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <JobCardSkeleton key={i} />)
            : data?.content.slice(0, 4).map((job) => (
                <JobCard key={job.publicId} job={job} />
              ))}
        </div>
      </div>
    </section>
  );
}
