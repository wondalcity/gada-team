"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  employerApi,
  type CompanyResponse,
  type SiteResponse,
  type CreateCompanyPayload,
  type UpdateCompanyPayload,
} from "@/lib/employer-api";
import { uploadImageToStorage } from "@/lib/firebase";

// ─── Helpers ──────────────────────────────────────────────────────

function siteStatusLabel(
  status: string
): { text: string; className: string } {
  const map: Record<string, { text: string; className: string }> = {
    PLANNING: { text: "계획 중", className: "bg-primary-50 text-primary-600" },
    ACTIVE: { text: "진행 중", className: "bg-success-100 text-success-700" },
    COMPLETED: {
      text: "완료",
      className: "bg-neutral-100 text-neutral-500",
    },
    SUSPENDED: {
      text: "중단",
      className: "bg-danger-50 text-danger-700",
    },
  };
  return (
    map[status] ?? {
      text: status,
      className: "bg-neutral-100 text-neutral-600",
    }
  );
}

function companyStatusInfo(status: CompanyResponse["status"]) {
  const map: Record<
    CompanyResponse["status"],
    { text: string; className: string }
  > = {
    PENDING: {
      text: "승인 대기",
      className: "bg-yellow-100 text-yellow-700",
    },
    ACTIVE: { text: "활성", className: "bg-success-100 text-success-700" },
    SUSPENDED: { text: "정지", className: "bg-danger-100 text-danger-700" },
    CLOSED: {
      text: "폐쇄",
      className: "bg-neutral-200 text-neutral-500",
    },
  };
  return map[status];
}

// ─── Toast ────────────────────────────────────────────────────────

function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-card-lg animate-fade-in">
      {message}
    </div>
  );
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
  const badge = siteStatusLabel(site.status);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 text-sm truncate">
            {site.name}
          </p>
          {site.address && (
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {site.address}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {(site.sido || site.sigungu) && (
              <span className="text-xs text-neutral-400">
                {[site.sido, site.sigungu].filter(Boolean).join(" · ")}
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
            >
              {badge.text}
            </span>
            <span className="text-xs text-neutral-400">
              공고 {site.activeJobCount}건
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
        <Link
          href={`/employer/sites/${site.publicId}/edit?companyId=${companyPublicId}`}
          className="flex-1 text-center border border-neutral-200 rounded-lg text-neutral-700 text-xs font-semibold py-2 hover:bg-neutral-50 transition-colors"
        >
          수정
        </Link>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex-1 text-center border border-danger-200 rounded-lg text-danger-500 text-xs font-semibold py-2 hover:bg-danger-50 transition-colors"
          >
            삭제
          </button>
        ) : (
          <button
            onClick={() => {
              setConfirming(false);
              onDelete(site.publicId);
            }}
            className="flex-1 text-center bg-danger-500 rounded-lg text-white text-xs font-semibold py-2 hover:bg-danger-700 transition-colors"
          >
            정말 삭제
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function CompanyPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] =
    useState("");
  const [ceoName, setCeoName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const {
    data: company,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["employer", "company"],
    queryFn: () => employerApi.getMyCompany(),
    throwOnError: false,
    retry: false,
  });

  const isCreateMode = isError || (!isLoading && !company);

  // Populate form when company loads
  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setBusinessRegistrationNumber(
        company.businessRegistrationNumber ?? ""
      );
      setCeoName(company.ceoName ?? "");
      setAddress(company.address ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.email ?? "");
      setWebsiteUrl(company.websiteUrl ?? "");
      setDescription(company.description ?? "");
      setLogoUrl(company.logoUrl ?? "");
    }
  }, [company]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    setIsUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `profiles/companies/${company.publicId}_${Date.now()}.${ext}`;
      const url = await uploadImageToStorage(file, path);
      setLogoUrl(url);
      await employerApi.updateMyCompany(company.publicId, { logoUrl: url });
      queryClient.invalidateQueries({ queryKey: ["employer", "company"] });
      setToast("로고가 업로드되었습니다.");
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  // Sites
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["employer", "sites", company?.publicId],
    queryFn: () => employerApi.getMySites(company!.publicId),
    enabled: !!company?.publicId,
    throwOnError: false,
    retry: false,
  });

  // Create company
  const createMutation = useMutation({
    mutationFn: (payload: CreateCompanyPayload) =>
      employerApi.createCompany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "company"] });
      setToast("회사가 등록되었습니다.");
    },
  });

  // Update company
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCompanyPayload) =>
      employerApi.updateMyCompany(company!.publicId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "company"] });
      setToast("회사 정보가 저장되었습니다.");
    },
  });

  // Delete site
  const deleteSiteMutation = useMutation({
    mutationFn: (sitePublicId: string) =>
      employerApi.deleteSite(company!.publicId, sitePublicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employer", "sites", company?.publicId],
      });
      setToast("현장이 삭제되었습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      businessRegistrationNumber: businessRegistrationNumber || undefined,
      ceoName: ceoName || undefined,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      websiteUrl: websiteUrl || undefined,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
    };
    if (isCreateMode) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const inputClass =
    "w-full border border-neutral-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400";

  return (
    <div>
      {toast && (
        <Toast message={toast} onClose={() => setToast(null)} />
      )}

      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-neutral-950">회사 정보</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {isCreateMode
            ? "회사 정보를 등록하면 공고를 게시할 수 있습니다."
            : "회사 프로필을 수정하세요."}
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-card-md p-6 animate-pulse">
          <div className="h-4 w-32 bg-neutral-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-neutral-100 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 bg-white rounded-lg shadow-card-md p-6"
          >
            {/* Logo upload */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-100">
              <div className="relative flex-shrink-0">
                {isUploadingLogo ? (
                  <div className="h-16 w-16 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                  </div>
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="로고"
                    className="h-16 w-16 rounded-lg object-cover border border-neutral-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-neutral-100 flex items-center justify-center border border-dashed border-neutral-300">
                    <span className="text-2xl font-bold text-neutral-400">
                      {name ? name[0] : "C"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">회사 로고</p>
                <p className="text-xs text-neutral-500 mt-0.5 mb-2">JPG, PNG (권장: 200×200px)</p>
                <button
                  type="button"
                  disabled={isUploadingLogo || !company}
                  onClick={() => logoInputRef.current?.click()}
                  className="text-xs font-medium text-primary-500 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-500/5 disabled:opacity-50 transition-colors"
                >
                  로고 변경
                </button>
                {!company && (
                  <p className="text-xs text-neutral-400 mt-1">회사를 먼저 등록해주세요</p>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            <h2 className="text-base font-semibold text-neutral-900 mb-4">
              기본 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  회사명 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="(주) 가다건설"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  value={businessRegistrationNumber}
                  onChange={(e) =>
                    setBusinessRegistrationNumber(e.target.value)
                  }
                  placeholder="000-00-00000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  대표자명
                </label>
                <input
                  type="text"
                  value={ceoName}
                  onChange={(e) => setCeoName(e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  주소
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="서울특별시 강남구 테헤란로 123"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-6 mt-6">
              <h2 className="text-base font-semibold text-neutral-900 mb-4">
                연락처
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    전화번호
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="02-1234-5678"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hr@company.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    웹사이트 URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.company.com"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-6 mt-6">
              <h2 className="text-base font-semibold text-neutral-900 mb-4">
                회사 소개
              </h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="회사 소개를 입력해주세요."
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="bg-primary-500 text-white rounded-lg py-3 px-6 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? "저장 중..."
                  : isCreateMode
                  ? "회사 등록"
                  : "저장"}
              </button>
            </div>
          </form>

          {/* Status sidebar */}
          {!isCreateMode && company && (
            <div className="w-full lg:w-64 shrink-0">
              <div className="bg-white rounded-lg shadow-card-md p-6">
                <h2 className="text-base font-semibold text-neutral-900 mb-4">
                  상태
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">승인 상태</span>
                    {(() => {
                      const info = companyStatusInfo(company.status);
                      return (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${info.className}`}
                        >
                          {info.text}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">본인 인증</span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        company.isVerified
                          ? "bg-success-100 text-success-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {company.isVerified ? "완료" : "미완료"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">현장 수</span>
                    <span className="text-xs font-bold text-neutral-900">
                      {company.siteCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      게시 중 공고
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      {company.activeJobCount}
                    </span>
                  </div>
                </div>
                {company.status === "PENDING" && (
                  <div className="mt-4 bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs text-yellow-700">
                      승인 요청됨. 관리자 검토 후 활성화됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sites section */}
      {!isCreateMode && company && (
        <div className="border-t border-neutral-100 pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">
              우리 현장
            </h2>
            <Link
              href="/employer/sites/new"
              className="text-xs bg-primary-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors"
            >
              + 현장 추가
            </Link>
          </div>

          {sitesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-card h-36 animate-pulse"
                />
              ))}
            </div>
          ) : !sites || sites.length === 0 ? (
            <div className="bg-white rounded-lg shadow-card border border-neutral-100 p-10 text-center">
              <p className="text-sm text-neutral-400 mb-4">
                아직 등록된 현장이 없습니다.
              </p>
              <Link
                href="/employer/sites/new"
                className="inline-block bg-primary-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                + 현장 추가
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => (
                <SiteCard
                  key={site.publicId}
                  site={site}
                  companyPublicId={company.publicId}
                  onDelete={(id) => deleteSiteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
