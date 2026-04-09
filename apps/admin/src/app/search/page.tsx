"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  getAdminJobs,
  getAdminCompanies,
  AdminJobItem,
  AdminCompanyItem,
  PagedResponse,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@gada/ui";
import { Search, Briefcase, Building2 } from "lucide-react";

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: jobResults, isLoading: jobsLoading } = useQuery<PagedResponse<AdminJobItem>>({
    queryKey: ["admin", "search", "jobs", submitted],
    queryFn: () => getAdminJobs({ keyword: submitted, size: 5 }),
    enabled: submitted.length > 1,
  });

  const { data: companyResults, isLoading: companiesLoading } = useQuery<PagedResponse<AdminCompanyItem>>({
    queryKey: ["admin", "search", "companies", submitted],
    queryFn: () => getAdminCompanies({ keyword: submitted, size: 5 }),
    enabled: submitted.length > 1,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  const totalResults =
    (jobResults?.totalElements ?? 0) + (companyResults?.totalElements ?? 0);

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "대시보드", href: "/dashboard" },
        { label: "통합 검색" },
      ]}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-950">통합 검색</h1>
        <p className="mt-1 text-sm text-neutral-500">
          공고, 기업, 근로자를 한번에 검색합니다.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="공고명, 회사명으로 검색..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-brand-blue-dark transition-colors"
          >
            검색
          </button>
        </div>
      </form>

      {submitted && (
        <p className="text-sm text-neutral-500 mb-4">
          &ldquo;{submitted}&rdquo; 검색 결과 — 총{" "}
          {totalResults.toLocaleString("ko-KR")}건
        </p>
      )}

      {submitted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Job results */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-brand-blue" />
                <CardTitle>공고 ({jobResults?.totalElements ?? 0}건)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {jobsLoading ? (
                <div className="px-5 py-4 text-sm text-neutral-400">
                  검색 중...
                </div>
              ) : jobResults?.content.length === 0 ? (
                <div className="px-5 py-4 text-sm text-neutral-400">
                  결과가 없습니다.
                </div>
              ) : (
                <>
                  {jobResults?.content.map((job) => (
                    <a
                      key={job.publicId}
                      href={`/jobs/${job.publicId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 border-t border-neutral-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {job.companyName} · {job.siteName}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          job.status === "PUBLISHED"
                            ? "bg-green-100 text-green-700"
                            : job.status === "DRAFT"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {job.status}
                      </span>
                    </a>
                  ))}
                  {(jobResults?.totalElements ?? 0) > 5 && (
                    <a
                      href={`/jobs?keyword=${submitted}`}
                      className="flex items-center justify-center py-3 text-xs text-brand-blue font-semibold hover:bg-neutral-50 border-t border-neutral-100"
                    >
                      전체 공고 보기 →
                    </a>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Company results */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-blue" />
                <CardTitle>
                  기업 ({companyResults?.totalElements ?? 0}건)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {companiesLoading ? (
                <div className="px-5 py-4 text-sm text-neutral-400">
                  검색 중...
                </div>
              ) : companyResults?.content.length === 0 ? (
                <div className="px-5 py-4 text-sm text-neutral-400">
                  결과가 없습니다.
                </div>
              ) : (
                <>
                  {companyResults?.content.map((company) => (
                    <a
                      key={company.publicId}
                      href={`/companies/${company.publicId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 border-t border-neutral-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {company.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {company.businessRegistrationNumber ?? "—"}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          company.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : company.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {company.isVerified ? "✓ " : ""}
                        {company.status}
                      </span>
                    </a>
                  ))}
                  {(companyResults?.totalElements ?? 0) > 5 && (
                    <a
                      href={`/companies?keyword=${submitted}`}
                      className="flex items-center justify-center py-3 text-xs text-brand-blue font-semibold hover:bg-neutral-50 border-t border-neutral-100"
                    >
                      전체 기업 보기 →
                    </a>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!submitted && (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Search className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">검색어를 입력해 주세요</p>
        </div>
      )}
    </AdminLayout>
  );
}
