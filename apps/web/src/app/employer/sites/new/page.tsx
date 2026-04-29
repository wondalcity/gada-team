"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { employerApi, type CreateSitePayload } from "@/lib/employer-api";
import { DateInput } from "@/components/ui/DateInput";
import { useT } from "@/lib/i18n";

export default function NewSitePage() {
  const router = useRouter();
  const t = useT();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["employer", "company"],
    queryFn: () => employerApi.getMyCompany(),
    throwOnError: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSitePayload) =>
      employerApi.createSite(company!.publicId, payload),
    onSuccess: () => {
      router.push("/employer/sites");
    },
    onError: (err: Error) => {
      setError(err.message || t("employer.siteRegisterFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!name.trim()) {
      setError(t("employer.siteNameRequired"));
      return;
    }
    if (!address.trim()) {
      setError(t("employer.siteAddressRequired"));
      return;
    }
    setError(null);
    createMutation.mutate({
      name,
      address,
      addressDetail: addressDetail || undefined,
      description: description || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const inputClass =
    "w-full border border-neutral-200 rounded-lg px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 bg-white";

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-500 text-sm mb-4">
          {t("employer.siteNeedCompanyMsg")}
        </p>
        <a
          href="/employer/company"
          className="inline-block bg-primary-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          {t("employer.registerCompanyBtn")}
        </a>
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
          {t("employer.back")}
        </button>
        <h1 className="text-xl font-extrabold text-neutral-950">{t("employer.siteAdd")}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{company.name}</p>
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
          {t("employer.siteInfo")}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              {t("employer.siteNameLabel")} <span className="text-danger-500">*</span>
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
              {t("employer.siteAddressLabel")} <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="서울특별시 강남구 테헤란로 123"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              {t("employer.siteAddressDetailLabel")}
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
              {t("employer.siteDescLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("employer.siteDescPlaceholder")}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-6 mt-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            {t("employer.siteScheduleLabel")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                {t("employer.siteStartDateLabel")}
              </label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                placeholder={t("employer.siteStartDateLabel")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                {t("employer.siteEndDateLabel")}
              </label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                placeholder={t("employer.siteEndDateLabel")}
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
            {t("employer.cancel")}
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-primary-500 text-white rounded-lg py-3 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? t("employer.registering") : t("employer.siteRegisterBtn")}
          </button>
        </div>
      </form>
    </div>
  );
}
