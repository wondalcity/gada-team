"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  getAdminCategories,
  createIntroContent,
  updateIntroContent,
  publishIntroContent,
  unpublishIntroContent,
  IntroContentResponse,
  ContentSection,
  SkillEntry,
  PricingNote,
  AdminCategoryItem,
  UpsertIntroContentRequest,
} from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────

export interface IntroContentFormProps {
  /** Pass existing content for edit mode; undefined for create mode */
  existing?: IntroContentResponse;
}

// ─── Section Heading ───────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-neutral-700 mb-4">{children}</h3>
  );
}

// ─── Form ──────────────────────────────────────────────────────

export function IntroContentForm({ existing }: IntroContentFormProps) {
  const router = useRouter();
  const isEdit = !!existing;

  // ── Meta fields ───────────────────────────────────────────
  const [categoryCode, setCategoryCode] = useState(existing?.categoryCode ?? "");
  const [locale, setLocale] = useState(existing?.locale ?? "ko");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(existing?.heroImageUrl ?? "");
  const [metaDescription, setMetaDescription] = useState(existing?.metaDescription ?? "");
  const [readingTimeMin, setReadingTimeMin] = useState<string>(
    existing?.readingTimeMin != null ? String(existing.readingTimeMin) : ""
  );
  const [body, setBody] = useState(existing?.body ?? "");

  // ── Work Characteristics ──────────────────────────────────
  const [workCharacteristics, setWorkCharacteristics] = useState<ContentSection[]>(
    existing?.workCharacteristics ?? []
  );

  // ── Related Skills ────────────────────────────────────────
  const [relatedSkills, setRelatedSkills] = useState<SkillEntry[]>(
    existing?.relatedSkills ?? []
  );

  // ── Pricing Notes ─────────────────────────────────────────
  const [pricingNotes, setPricingNotes] = useState<PricingNote[]>(
    existing?.pricingNotes ?? []
  );

  // ── Content Images ────────────────────────────────────────
  const [contentImages, setContentImages] = useState<{ url: string; caption?: string }[]>(
    existing?.contentImages ?? []
  );

  const [error, setError] = useState<string | null>(null);

  // ── Categories ────────────────────────────────────────────
  const { data: categories } = useQuery<AdminCategoryItem[]>({
    queryKey: ["admin", "content", "categories"],
    queryFn: getAdminCategories,
  });

  // ── Mutations ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (req: { categoryCode: string; locale: string; content: UpsertIntroContentRequest }) =>
      createIntroContent(req),
    onSuccess: (data) => {
      router.push(`/content/intro/${data.publicId}/edit`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (req: UpsertIntroContentRequest) =>
      updateIntroContent(existing!.publicId, req),
    onError: (e: Error) => setError(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishIntroContent(existing!.publicId),
    onError: (e: Error) => setError(e.message),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishIntroContent(existing!.publicId),
    onError: (e: Error) => setError(e.message),
  });

  function buildRequest(): UpsertIntroContentRequest {
    return {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      body,
      heroImageUrl: heroImageUrl.trim() || null,
      workCharacteristics,
      relatedSkills,
      pricingNotes: pricingNotes.length > 0 ? pricingNotes : null,
      contentImages,
      metaDescription: metaDescription.trim() || null,
      readingTimeMin: readingTimeMin ? parseInt(readingTimeMin, 10) : null,
    };
  }

  async function handleSaveDraft() {
    setError(null);
    if (!title.trim()) { setError("제목을 입력하세요."); return; }
    if (!body.trim()) { setError("본문을 입력하세요."); return; }

    if (isEdit) {
      await updateMutation.mutateAsync(buildRequest());
    } else {
      if (!categoryCode) { setError("직종을 선택하세요."); return; }
      await createMutation.mutateAsync({ categoryCode, locale, content: buildRequest() });
    }
  }

  async function handleSaveAndPublish() {
    setError(null);
    if (!title.trim()) { setError("제목을 입력하세요."); return; }
    if (!body.trim()) { setError("본문을 입력하세요."); return; }

    if (isEdit) {
      await updateMutation.mutateAsync(buildRequest());
      await publishMutation.mutateAsync();
    } else {
      if (!categoryCode) { setError("직종을 선택하세요."); return; }
      const created = await createMutation.mutateAsync({ categoryCode, locale, content: buildRequest() });
      await publishIntroContent(created.publicId);
      router.push(`/content/intro/${created.publicId}/edit`);
    }
  }

  const isSaving =
    createMutation.isPending || updateMutation.isPending || publishMutation.isPending;

  // ── Work Characteristics helpers ─────────────────────────
  function addCharacteristic() {
    setWorkCharacteristics((prev) => [...prev, { title: "", description: "" }]);
  }
  function updateCharacteristic(idx: number, field: keyof ContentSection, val: string) {
    setWorkCharacteristics((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );
  }
  function removeCharacteristic(idx: number) {
    setWorkCharacteristics((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Related Skills helpers ────────────────────────────────
  function addSkill() {
    setRelatedSkills((prev) => [...prev, { name: "", level: "REQUIRED" }]);
  }
  function updateSkill(idx: number, field: keyof SkillEntry, val: string) {
    setRelatedSkills((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  }
  function removeSkill(idx: number) {
    setRelatedSkills((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Pricing Notes helpers ─────────────────────────────────
  function addPricing() {
    setPricingNotes((prev) => [
      ...prev,
      { type: "DAILY", minAmount: 0, maxAmount: 0, note: null },
    ]);
  }
  function updatePricing(idx: number, field: keyof PricingNote, val: string | number | null) {
    setPricingNotes((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    );
  }
  function removePricing(idx: number) {
    setPricingNotes((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Content Images helpers ────────────────────────────────
  function addImage() {
    setContentImages((prev) => [...prev, { url: "", caption: "" }]);
  }
  function updateImage(idx: number, field: "url" | "caption", val: string) {
    setContentImages((prev) =>
      prev.map((img, i) => (i === idx ? { ...img, [field]: val } : img))
    );
  }
  function removeImage(idx: number) {
    setContentImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Input / Textarea styles ───────────────────────────────
  const inputCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue";
  const textareaCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <button
          onClick={() => router.push("/content/intro")}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          소개글 목록
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950">
              {isEdit ? "소개글 편집" : "새 소개글 작성"}
            </h1>
            {isEdit && (
              <p className="text-xs text-neutral-400 mt-1">
                마지막 수정: {new Date(existing.updatedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>

          {/* Publish toggle for edit mode */}
          {isEdit && (
            <div className="flex items-center gap-2">
              {existing.isPublished ? (
                <button
                  onClick={() => unpublishMutation.mutate()}
                  disabled={unpublishMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  <EyeOff className="h-4 w-4" />
                  게시 취소
                </button>
              ) : (
                <button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  게시하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main form — two column on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Meta */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6 space-y-5">
            <SectionHeading>기본 정보</SectionHeading>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                직종 <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                disabled={isEdit}
                className={`${inputCls} disabled:bg-neutral-50 disabled:text-neutral-500`}
              >
                <option value="">직종 선택...</option>
                {(categories ?? []).map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.nameKo} ({cat.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Locale */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                언어 <span className="text-red-500">*</span>
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                disabled={isEdit}
                className={`${inputCls} disabled:bg-neutral-50 disabled:text-neutral-500`}
              >
                <option value="ko">한국어 (ko)</option>
                <option value="en">영어 (en)</option>
                <option value="vi">베트남어 (vi)</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="소개글 제목"
                className={inputCls}
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                부제목
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="선택 사항"
                className={inputCls}
              />
            </div>

            {/* Hero Image URL */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                대표 이미지 URL
              </label>
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>

            {/* Reading time */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                읽기 소요 시간 (분)
              </label>
              <input
                type="number"
                value={readingTimeMin}
                onChange={(e) => setReadingTimeMin(e.target.value)}
                min="1"
                placeholder="예: 5"
                className={inputCls}
              />
            </div>

            {/* Meta description */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                메타 설명{" "}
                <span className="text-neutral-400 font-normal">(SEO, 최대 300자)</span>
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="검색 엔진에 표시될 설명"
                className={textareaCls}
              />
              <p className="text-[10px] text-neutral-400 mt-1 text-right">
                {metaDescription.length}/300
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Body + dynamic sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Body */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <SectionHeading>본문 내용</SectionHeading>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="직종 소개 본문을 입력하세요..."
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
              style={{ minHeight: 200 }}
            />
            <p className="text-xs text-neutral-400 mt-2">줄바꿈이 그대로 표시됩니다</p>
          </div>

          {/* Work Characteristics */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeading>작업 특성</SectionHeading>
              <button
                type="button"
                onClick={addCharacteristic}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                작업 특성 추가
              </button>
            </div>

            {workCharacteristics.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                작업 특성 항목이 없습니다. 추가 버튼을 클릭하세요.
              </p>
            ) : (
              <div className="space-y-4">
                {workCharacteristics.map((wc, idx) => (
                  <div
                    key={idx}
                    className="relative border border-neutral-100 rounded-xl p-4 bg-neutral-50"
                  >
                    <button
                      type="button"
                      onClick={() => removeCharacteristic(idx)}
                      className="absolute right-3 top-3 h-6 w-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          제목
                        </label>
                        <input
                          type="text"
                          value={wc.title}
                          onChange={(e) => updateCharacteristic(idx, "title", e.target.value)}
                          placeholder="특성 제목"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          설명
                        </label>
                        <textarea
                          value={wc.description}
                          onChange={(e) =>
                            updateCharacteristic(idx, "description", e.target.value)
                          }
                          rows={2}
                          placeholder="특성 설명"
                          className={textareaCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Skills */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeading>관련 기술</SectionHeading>
              <button
                type="button"
                onClick={addSkill}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                기술 추가
              </button>
            </div>

            {relatedSkills.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                관련 기술이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {relatedSkills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => updateSkill(idx, "name", e.target.value)}
                      placeholder="기술명"
                      className={`${inputCls} flex-1`}
                    />
                    <select
                      value={skill.level}
                      onChange={(e) => updateSkill(idx, "level", e.target.value)}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white w-32"
                    >
                      <option value="REQUIRED">필수</option>
                      <option value="RECOMMENDED">권장</option>
                      <option value="OPTIONAL">선택</option>
                      <option value="ADVANCED">고급</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSkill(idx)}
                      className="h-8 w-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Notes */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeading>임금 정보</SectionHeading>
              <button
                type="button"
                onClick={addPricing}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                임금 정보 추가
              </button>
            </div>

            {pricingNotes.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                임금 정보가 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {pricingNotes.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative border border-neutral-100 rounded-xl p-4 bg-neutral-50"
                  >
                    <button
                      type="button"
                      onClick={() => removePricing(idx)}
                      className="absolute right-3 top-3 h-6 w-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pr-8">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          유형
                        </label>
                        <select
                          value={p.type}
                          onChange={(e) => updatePricing(idx, "type", e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 px-2.5 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                        >
                          <option value="DAILY">일급</option>
                          <option value="HOURLY">시급</option>
                          <option value="MONTHLY">월급</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          최소 금액
                        </label>
                        <input
                          type="number"
                          value={p.minAmount}
                          onChange={(e) =>
                            updatePricing(idx, "minAmount", parseInt(e.target.value, 10) || 0)
                          }
                          min="0"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          최대 금액
                        </label>
                        <input
                          type="number"
                          value={p.maxAmount}
                          onChange={(e) =>
                            updatePricing(idx, "maxAmount", parseInt(e.target.value, 10) || 0)
                          }
                          min="0"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          비고
                        </label>
                        <input
                          type="text"
                          value={p.note ?? ""}
                          onChange={(e) =>
                            updatePricing(idx, "note", e.target.value || null)
                          }
                          placeholder="선택 사항"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content Images */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeading>콘텐츠 이미지</SectionHeading>
              <button
                type="button"
                onClick={addImage}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                이미지 추가
              </button>
            </div>

            {contentImages.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                이미지가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {contentImages.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={img.url}
                      onChange={(e) => updateImage(idx, "url", e.target.value)}
                      placeholder="이미지 URL"
                      className={`${inputCls} flex-1`}
                    />
                    <input
                      type="text"
                      value={img.caption ?? ""}
                      onChange={(e) => updateImage(idx, "caption", e.target.value)}
                      placeholder="캡션 (선택)"
                      className={`${inputCls} w-48`}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="h-8 w-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit buttons */}
          <div className="flex items-center gap-3 justify-end pb-8">
            <button
              type="button"
              onClick={() => router.push("/content/intro")}
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장 (초안)"}
            </button>
            <button
              type="button"
              onClick={handleSaveAndPublish}
              disabled={isSaving}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? "처리 중..." : "저장 및 게시"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
