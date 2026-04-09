"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAdminCompanies, getAdminJobs, PagedResponse, AdminCompanyItem, AdminJobItem } from "@/lib/api";
import {
  HardHat,
  Briefcase,
  FileText,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@gada/ui";

const RECENT_APPLICATIONS = [
  {
    id: 1,
    applicant: "김민준",
    job: "콘크리트공 · 강남구 현장",
    type: "개인",
    status: "PENDING",
    time: "3분 전",
  },
  {
    id: 2,
    applicant: "팀 한빌더스",
    job: "철근공 · 수원시 현장",
    type: "팀",
    status: "REVIEWING",
    time: "15분 전",
  },
  {
    id: 3,
    applicant: "(주)대성건설",
    job: "비계공 팀 4명 · 판교",
    type: "기업",
    status: "SHORTLISTED",
    time: "28분 전",
  },
  {
    id: 4,
    applicant: "Nguyen Van A",
    job: "일반노무 · 부천시",
    type: "개인",
    status: "ACCEPTED",
    time: "1시간 전",
  },
  {
    id: 5,
    applicant: "이상철",
    job: "전기공 · 마포구",
    type: "개인",
    status: "REJECTED",
    time: "2시간 전",
  },
];

const STATUS_MAP: Record<
  string,
  { label: string; variant: "blue" | "green" | "yellow" | "red" | "purple" | "gray" }
> = {
  PENDING: { label: "검토 대기", variant: "yellow" },
  REVIEWING: { label: "검토 중", variant: "blue" },
  SHORTLISTED: { label: "서류 통과", variant: "purple" },
  ACCEPTED: { label: "합격", variant: "green" },
  REJECTED: { label: "불합격", variant: "red" },
};

export default function DashboardPage() {
  // Total company count
  const { data: companiesData } = useQuery<PagedResponse<AdminCompanyItem>>({
    queryKey: ["admin", "companies", "meta", "total"],
    queryFn: () => getAdminCompanies({ page: 0, size: 1 }),
  });

  // Pending companies count
  const { data: pendingCompaniesData } = useQuery<PagedResponse<AdminCompanyItem>>({
    queryKey: ["admin", "companies", "meta", "pending"],
    queryFn: () => getAdminCompanies({ page: 0, size: 1, status: "PENDING" }),
  });

  // Published jobs count
  const { data: publishedJobsData } = useQuery<PagedResponse<AdminJobItem>>({
    queryKey: ["admin", "jobs", "meta", "published"],
    queryFn: () => getAdminJobs({ page: 0, size: 1, status: "PUBLISHED" }),
  });

  // Total jobs count
  const { data: jobsData } = useQuery<PagedResponse<AdminJobItem>>({
    queryKey: ["admin", "jobs", "meta", "total"],
    queryFn: () => getAdminJobs({ page: 0, size: 1 }),
  });

  const totalCompanies = companiesData?.totalElements?.toLocaleString("ko-KR") ?? "—";
  const pendingCompanies = pendingCompaniesData?.totalElements?.toLocaleString("ko-KR") ?? "—";
  const publishedJobs = publishedJobsData?.totalElements?.toLocaleString("ko-KR") ?? "—";
  const totalJobs = jobsData?.totalElements?.toLocaleString("ko-KR") ?? "—";

  const KPI_CARDS = [
    {
      label: "총 업체 수",
      value: totalCompanies,
      change: "+12",
      trend: "up" as const,
      icon: Building2,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "승인 대기",
      value: pendingCompanies,
      change: "",
      trend: "up" as const,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      label: "게시 중 공고",
      value: publishedJobs,
      change: "+89",
      trend: "up" as const,
      icon: Briefcase,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "총 공고 수",
      value: totalJobs,
      change: "+134",
      trend: "up" as const,
      icon: FileText,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드" }]}
      actions={
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 border border-green-200">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          시스템 정상
        </span>
      }
    >
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-950">대시보드</h1>
        <p className="mt-1 text-sm text-neutral-500">
          GADA 플랫폼 운영 현황입니다.
        </p>
      </div>

      {/* KPI Stats grid — 4 live cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {KPI_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} variant="default">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {stat.change && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        stat.trend === "up" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {stat.trend === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stat.change}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-neutral-950">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-sm text-neutral-500">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent applications */}
        <div className="xl:col-span-2">
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>최근 지원서</CardTitle>
                <a
                  href="/applications"
                  className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                >
                  전체 보기 <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-neutral-100 bg-neutral-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      지원자
                    </th>
                    <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      공고
                    </th>
                    <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      유형
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      상태
                    </th>
                    <th className="hidden lg:table-cell px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      시간
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {RECENT_APPLICATIONS.map((app) => {
                    const s = STATUS_MAP[app.status];
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-neutral-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 font-medium text-neutral-900">
                          {app.applicant}
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3.5 text-neutral-500 max-w-[200px] truncate">
                          {app.job}
                        </td>
                        <td className="hidden md:table-cell px-5 py-3.5">
                          <span className="inline-flex rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                            {app.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {s && (
                            <Badge variant={s.variant} dot size="sm">
                              {s.label}
                            </Badge>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-5 py-3.5 text-right text-xs text-neutral-400">
                          {app.time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions + status */}
        <div className="flex flex-col gap-4">
          <Card variant="default">
            <CardHeader>
              <CardTitle>빠른 작업</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { label: "새 공고 등록", icon: Briefcase, href: "/jobs/new" },
                { label: "근로자 조회", icon: HardHat, href: "/workers" },
                {
                  label: "기업 승인 검토",
                  icon: CheckCircle,
                  href: "/companies?status=PENDING",
                },
                {
                  label: "미처리 지원서",
                  icon: Clock,
                  href: "/applications?status=PENDING",
                },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <a
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg border border-neutral-100 px-3.5 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-200 transition-all"
                  >
                    <Icon className="h-4 w-4 text-neutral-500" />
                    {action.label}
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-neutral-300" />
                  </a>
                );
              })}
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle>오늘의 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "신규 가입", value: "47명", color: "text-brand-blue" },
                { label: "신규 공고", value: "12건", color: "text-emerald-600" },
                { label: "승인 대기 기업", value: pendingCompanies + "곳", color: "text-amber-600" },
                {
                  label: "처리 대기 지원서",
                  value: "28건",
                  color: "text-violet-600",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm text-neutral-600">{row.label}</span>
                  <span className={`text-sm font-bold ${row.color}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
