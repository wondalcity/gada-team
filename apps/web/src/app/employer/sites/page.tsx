"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { employerApi, type SiteResponse } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────

function siteStatusLabel(status: string, t: ReturnType<typeof useT>): { text: string; className: string } {
  const map: Record<string, { text: string; className: string }> = {
    PLANNING: { text: t("employer.siteStatusPlanning"), className: "bg-primary-50 text-primary-600" },
    ACTIVE: { text: t("employer.siteStatusActive"), className: "bg-success-100 text-success-700" },
    COMPLETED: { text: t("employer.siteStatusCompleted"), className: "bg-neutral-100 text-neutral-500" },
    SUSPENDED: { text: t("employer.siteStatusSuspended"), className: "bg-danger-50 text-danger-700" },
  };
  return map[status] ?? { text: status, className: "bg-neutral-100 text-neutral-600" };
}

// ─── Site card ────────────────────────────────────────────────────

function SiteCard({
  site,
  companyPublicId,
  onDelete,
}: {
  site: SiteResponse;
  companyPublicId: string;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const badge = siteStatusLabel(site.status, t);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 text-sm truncate">{site.name}</p>
          {site.address && (
            <p className="text-xs text-neutral-500 mt-0.5 truncate">{site.address}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {(site.sido || site.sigungu) && (
              <span className="text-xs text-neutral-400">
                {[site.sido, site.sigungu].filter(Boolean).join(" · ")}
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.text}
            </span>
            <span className="text-xs text-neutral-400">{t("employer.siteJobCount", site.activeJobCount)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
        <Link
          href={`/employer/sites/${site.publicId}/edit?companyId=${companyPublicId}`}
          className="flex-1 text-center border border-neutral-200 rounded-lg text-neutral-700 text-xs font-semibold py-2 hover:bg-neutral-50 transition-colors"
        >
          {t("employer.edit")}
        </Link>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex-1 text-center border border-danger-200 rounded-lg text-danger-500 text-xs font-semibold py-2 hover:bg-danger-50 transition-colors"
          >
            {t("employer.delete")}
          </button>
        ) : (
          <button
            onClick={() => { setConfirming(false); onDelete(site.publicId); }}
            className="flex-1 text-center bg-danger-500 rounded-lg text-white text-xs font-semibold py-2 hover:bg-danger-700 transition-colors"
          >
            {t("employer.confirmDelete")}
          </button>
        )}
      </div>
    </div>
  );
}

function SiteCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-5 animate-pulse">
      <div className="h-4 w-2/3 bg-neutral-200 rounded mb-2" />
      <div className="h-3 w-1/2 bg-neutral-100 rounded mb-3" />
      <div className="h-8 bg-neutral-100 rounded-lg mt-4" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function EmployerSitesPage() {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: company, isLoading: companyLoading, isError: companyError } = useQuery({
    queryKey: ["employer", "company"],
    queryFn: () => employerApi.getMyCompany(),
    throwOnError: false,
    retry: false,
  });

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["employer", "sites", company?.publicId],
    queryFn: () => employerApi.getMySites(company!.publicId),
    enabled: !!company?.publicId,
    throwOnError: false,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (sitePublicId: string) =>
      employerApi.deleteSite(company!.publicId, sitePublicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "sites", company?.publicId] });
    },
  });

  const isLoading = companyLoading || sitesLoading;

  // 회사 미등록
  if (!companyLoading && (companyError || !company)) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-neutral-950">{t("employer.siteMgmt")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{t("employer.siteMgmtDesc")}</p>
        </div>
        <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-12 text-center">
          <p className="text-sm text-neutral-500 mb-4">
            {t("employer.siteNeedCompany")}
          </p>
          <Link
            href="/employer/company"
            className="inline-block bg-primary-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            {t("employer.registerCompanyBtn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-950">{t("employer.siteMgmt")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {company ? company.name : ""}
            {!isLoading && sites ? ` · ${t("employer.siteTotal", sites.length)}` : ""}
          </p>
        </div>
        {company && (
          <Link
            href="/employer/sites/new"
            className="bg-primary-500 text-white rounded-lg py-2.5 px-4 font-semibold text-sm hover:bg-primary-600 transition-colors"
          >
            {t("employer.addSite")}
          </Link>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SiteCardSkeleton key={i} />)}
        </div>
      ) : !sites || sites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-12 text-center">
          <p className="text-sm text-neutral-400 mb-4">{t("employer.noSites")}</p>
          <Link
            href="/employer/sites/new"
            className="inline-block bg-primary-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            {t("employer.addSite")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site: SiteResponse) => (
            <SiteCard
              key={site.publicId}
              site={site}
              companyPublicId={company!.publicId}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
