"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employerApi, type UpdateSitePayload } from "@/lib/employer-api";

export default function EditSitePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const sitePublicId = params.id as string;
  const companyPublicId = searchParams.get("companyId") ?? "";

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: site, isLoading } = useQuery({
    queryKey: ["employer", "site", companyPublicId, sitePublicId],
    queryFn: () => employerApi.getSite(companyPublicId, sitePublicId),
    enabled: !!companyPublicId && !!sitePublicId,
    throwOnError: false,
    retry: false,
  });

  useEffect(() => {
    if (site) {
      setName(site.name ?? "");
      setAddress(site.address ?? "");
      setAddressDetail(site.addressDetail ?? "");
      setDescription(site.description ?? "");
      setStartDate(site.startDate ?? "");
      setEndDate(site.endDate ?? "");
    }
  }, [site]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSitePayload) =>
      employerApi.updateSite(companyPublicId, sitePublicId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employer", "sites", companyPublicId],
      });
      router.push("/employer/sites");
    },
    onError: (err: Error) => {
      setError(err.message || "저장에 실패했습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("현장명을 입력해주세요.");
      return;
    }
    setError(null);
    updateMutation.mutate({
      name,
      address: address || undefined,
      addressDetail: addressDetail || undefined,
      description: description || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const inputClass =
    "w-full border border-neutral-200 rounded-lg px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 bg-white";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-neutral-500 hover:text-neutral-700 mb-2 flex items-center gap-1"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-extrabold text-neutral-950">현장 수정</h1>
        {site && (
          <p className="text-sm text-neutral-500 mt-0.5">{site.companyName}</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-card-md p-6 max-w-xl"
      >
        {error && (
          <div className="mb-4 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        <h2 className="text-base font-semibold text-neutral-900 mb-4">
          현장 정보
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              현장명 <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 강남 오피스텔 신축 공사"
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

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              상세 주소
            </label>
            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="B동 3층"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              현장 소개
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="현장에 대한 추가 설명을 입력해주세요."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-6 mt-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            공사 일정
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                공사 시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                공사 종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-neutral-200 rounded-lg text-neutral-700 py-3 font-semibold text-sm hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
