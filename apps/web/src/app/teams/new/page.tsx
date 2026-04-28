"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Users,
  Building2,
  Globe,
  MapPin,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Briefcase,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { teamsApi, CreateTeamPayload, RegionEntry, PortfolioEntry } from "@/lib/teams-api";
import { uploadImageToStorage } from "@/lib/firebase";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDO_LIST = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const PAY_UNITS = [
  { value: "DAILY", label: "일급" },
  { value: "MONTHLY", label: "월급" },
];

// ─── Progress Indicator ────────────────────────────────────────────────────────

interface ProgressStep {
  label: string;
  status: "active" | "completed" | "future";
}

function ProgressIndicator({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                s.status === "completed"
                  ? "bg-primary-500 text-white"
                  : s.status === "active"
                  ? "bg-primary-500 text-white ring-4 ring-primary-500/20"
                  : "bg-neutral-100 text-neutral-400"
              )}
            >
              {s.status === "completed" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "mt-1.5 text-xs font-medium whitespace-nowrap",
                s.status === "active"
                  ? "text-primary-500"
                  : s.status === "completed"
                  ? "text-neutral-600"
                  : "text-neutral-400"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-12 mb-5 mx-1 transition-all",
                s.status === "completed" ? "bg-primary-500" : "bg-neutral-200"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <div
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-primary-500" : "bg-neutral-200"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-5.5 translate-x-0.5" : "left-0.5"
          )}
          style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
        />
      </div>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
    </button>
  );
}

// ─── Tag Input ─────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = React.useState("");

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form State ────────────────────────────────────────────────────────────────

interface PortfolioForm {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl: string; // single URL input, added to imageUrls array
}

interface FormState {
  name: string;
  teamType: "SQUAD" | "COMPANY_LINKED";
  introShort: string;
  coverImageUrl: string;
  isNationwide: boolean;
  selectedSido: string[];
  equipment: string[];
  headcountTarget: string;
  payUnit: string;
  desiredPayMin: string;
  desiredPayMax: string;
  introLong: string;
  portfolio: PortfolioForm[];
}

const initialState: FormState = {
  name: "",
  teamType: "SQUAD",
  introShort: "",
  coverImageUrl: "",
  isNationwide: false,
  selectedSido: [],
  equipment: [],
  headcountTarget: "",
  payUnit: "DAILY",
  desiredPayMin: "",
  desiredPayMax: "",
  introLong: "",
  portfolio: [],
};

// ─── Step 1: 기본 정보 ──────────────────────────────────────────────────────

function Step1({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [coverError, setCoverError] = React.useState<string | null>(null);
  const coverFileRef = React.useRef<HTMLInputElement>(null);

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCoverError("이미지 파일만 업로드할 수 있어요 (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("파일 크기는 5MB 이하여야 해요");
      return;
    }
    setCoverError(null);
    setUploadingCover(true);
    try {
      const path = `teams/covers/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const url = await uploadImageToStorage(file, path);
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } catch {
      setCoverError("업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Team name */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
          팀 이름 <span className="text-danger-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예) 홍길동 철근팀"
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* Team type */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-neutral-700">
          팀 유형 <span className="text-danger-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              value: "SQUAD" as const,
              icon: Users,
              title: "스쿼드 팀",
              desc: "독립적으로 운영되는 팀",
            },
            {
              value: "COMPANY_LINKED" as const,
              icon: Building2,
              title: "기업 소속 팀",
              desc: "기업에 소속된 팀",
            },
          ].map(({ value, icon: Icon, title, desc }) => {
            const selected = form.teamType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, teamType: value }))}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
                  selected
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className={cn(
                      "font-semibold",
                      selected ? "text-primary-500" : "text-neutral-800"
                    )}
                  >
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{desc}</p>
                </div>
                {selected && (
                  <div className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-500">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intro short */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-semibold text-neutral-700">
            팀 소개 (간단)
          </label>
          <span className="text-xs text-neutral-400">
            {form.introShort.length}/200
          </span>
        </div>
        <textarea
          value={form.introShort}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              introShort: e.target.value.slice(0, 200),
            }))
          }
          placeholder="팀을 한 문장으로 소개해주세요"
          rows={3}
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
        />
      </div>

      {/* Cover image upload */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
          팀 대표 사진 (선택)
        </label>

        {/* Hidden file input */}
        <input
          ref={coverFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverFileChange}
        />

        {form.coverImageUrl ? (
          /* Preview with change / remove buttons */
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            <img
              src={form.coverImageUrl}
              alt="팀 사진 미리보기"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-end gap-2 p-2 bg-gradient-to-t from-black/30 to-transparent">
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploadingCover}
                className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-white transition-colors shadow-sm"
              >
                변경
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, coverImageUrl: "" }))}
                className="rounded-lg bg-danger-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger-600 transition-colors shadow-sm"
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          /* Upload button */
          <button
            type="button"
            onClick={() => coverFileRef.current?.click()}
            disabled={uploadingCover}
            className={cn(
              "flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all",
              uploadingCover
                ? "border-primary-300 bg-primary-50 cursor-not-allowed"
                : "border-neutral-200 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50 cursor-pointer"
            )}
          >
            {uploadingCover ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                <p className="text-xs text-primary-600 font-medium">업로드 중...</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-neutral-400" />
                <p className="text-sm font-medium text-neutral-600">사진 선택</p>
                <p className="text-xs text-neutral-400">JPG, PNG, WebP · 최대 5MB</p>
              </>
            )}
          </button>
        )}

        {coverError && (
          <p className="mt-1.5 text-xs text-danger-600">{coverError}</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: 지역 & 역량 ───────────────────────────────────────────────────

function Step2({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const toggleSido = (sido: string) => {
    setForm((f) => ({
      ...f,
      selectedSido: f.selectedSido.includes(sido)
        ? f.selectedSido.filter((s) => s !== sido)
        : [...f.selectedSido, sido],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Nationwide toggle */}
      <div className="rounded-lg border border-neutral-200 p-4">
        <ToggleSwitch
          checked={form.isNationwide}
          onChange={(v) => setForm((f) => ({ ...f, isNationwide: v }))}
          label="전국 활동"
        />
        <p className="mt-1.5 text-xs text-neutral-400 ml-14">
          전국 어디서든 활동 가능한 팀
        </p>
      </div>

      {/* Region chips */}
      {!form.isNationwide && (
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
            <MapPin className="h-4 w-4 text-primary-500" />
            활동 지역 선택
          </label>
          <div className="flex flex-wrap gap-2">
            {SIDO_LIST.map((sido) => {
              const selected = form.selectedSido.includes(sido);
              return (
                <button
                  key={sido}
                  type="button"
                  onClick={() => toggleSido(sido)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all min-h-[44px]",
                    selected
                      ? "bg-primary-500 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  {sido}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Equipment */}
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
          <Wrench className="h-4 w-4 text-primary-500" />
          보유 장비
        </label>
        <TagInput
          tags={form.equipment}
          onChange={(equipment) => setForm((f) => ({ ...f, equipment }))}
          placeholder="예) 굴착기, 지게차"
        />
      </div>
    </div>
  );
}

// ─── Step 3: 모집 조건 ─────────────────────────────────────────────────────

function Step3({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="space-y-5">
      {/* Headcount target */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
          모집 인원 (명)
        </label>
        <input
          type="number"
          min={1}
          value={form.headcountTarget}
          onChange={(e) =>
            setForm((f) => ({ ...f, headcountTarget: e.target.value }))
          }
          placeholder="몇 명을 모집할까요?"
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* Pay unit */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-neutral-700">
          급여 단위
        </label>
        <div className="flex gap-2">
          {PAY_UNITS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, payUnit: value }))}
              className={cn(
                "flex-1 rounded-lg border py-3 text-sm font-semibold transition-all",
                form.payUnit === value
                  ? "border-primary-500 bg-primary-500 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pay range */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
          희망 급여 범위
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={form.desiredPayMin}
            onChange={(e) =>
              setForm((f) => ({ ...f, desiredPayMin: e.target.value }))
            }
            placeholder="최소"
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-neutral-400">~</span>
          <input
            type="number"
            value={form.desiredPayMax}
            onChange={(e) =>
              setForm((f) => ({ ...f, desiredPayMax: e.target.value }))
            }
            placeholder="최대"
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-sm text-neutral-500">원</span>
        </div>
      </div>

      {/* Intro long */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
          자세한 팀 소개 (선택)
        </label>
        <textarea
          value={form.introLong}
          onChange={(e) =>
            setForm((f) => ({ ...f, introLong: e.target.value }))
          }
          placeholder="팀의 경력, 전문 분야, 근무 방식 등을 자유롭게 작성해주세요"
          rows={5}
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
        />
      </div>

      {/* Portfolio */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
            <Briefcase className="h-4 w-4 text-primary-500" />
            포트폴리오 (선택)
          </label>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                portfolio: [
                  ...f.portfolio,
                  { title: "", description: "", startDate: "", endDate: "", imageUrl: "" },
                ],
              }))
            }
            className="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-500 hover:bg-primary-500/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            항목 추가
          </button>
        </div>

        {form.portfolio.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 py-4 text-center text-sm text-neutral-400">
            과거 작업 이력을 추가하면 팀원 모집에 도움이 돼요
          </p>
        ) : (
          <div className="space-y-3">
            {form.portfolio.map((item, idx) => (
              <div key={idx} className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      portfolio: f.portfolio.filter((_, i) => i !== idx),
                    }))
                  }
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 hover:bg-danger-100 hover:text-danger-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600">
                    프로젝트명 *
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      setForm((f) => {
                        const p = [...f.portfolio];
                        p[idx] = { ...p[idx], title: e.target.value };
                        return { ...f, portfolio: p };
                      })
                    }
                    placeholder="예) 강남구 아파트 철근 공사"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-600">시작일</label>
                    <input
                      type="date"
                      value={item.startDate}
                      onChange={(e) =>
                        setForm((f) => {
                          const p = [...f.portfolio];
                          p[idx] = { ...p[idx], startDate: e.target.value };
                          return { ...f, portfolio: p };
                        })
                      }
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-600">종료일</label>
                    <input
                      type="date"
                      value={item.endDate}
                      onChange={(e) =>
                        setForm((f) => {
                          const p = [...f.portfolio];
                          p[idx] = { ...p[idx], endDate: e.target.value };
                          return { ...f, portfolio: p };
                        })
                      }
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600">설명</label>
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      setForm((f) => {
                        const p = [...f.portfolio];
                        p[idx] = { ...p[idx], description: e.target.value };
                        return { ...f, portfolio: p };
                      })
                    }
                    placeholder="공사 내용, 규모, 역할 등 간단히 작성해주세요"
                    rows={2}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600">현장 사진 URL (선택)</label>
                  <input
                    type="url"
                    value={item.imageUrl}
                    onChange={(e) =>
                      setForm((f) => {
                        const p = [...f.portfolio];
                        p[idx] = { ...p[idx], imageUrl: e.target.value };
                        return { ...f, portfolio: p };
                      })
                    }
                    placeholder="https://..."
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  {item.imageUrl && (
                    <div className="mt-2 h-24 w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                      <img
                        src={item.imageUrl}
                        alt="사진 미리보기"
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewTeamPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(initialState);
  const [error, setError] = React.useState<string | null>(null);

  const STEPS = ["기본 정보", "지역 & 역량", "모집 · 포트폴리오"];

  const progressSteps = STEPS.map((label, i) => ({
    label,
    status: (i < step ? "completed" : i === step ? "active" : "future") as
      | "active"
      | "completed"
      | "future",
  }));

  const canProceed = () => {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateTeamPayload) => teamsApi.createTeam(payload),
    onSuccess: () => {
      router.push("/teams/mine");
    },
    onError: (err: any) => {
      setError(err?.message || "팀 생성에 실패했어요. 다시 시도해주세요.");
    },
  });

  const handleSubmit = () => {
    setError(null);
    const regions: RegionEntry[] = form.isNationwide
      ? []
      : form.selectedSido.map((sido) => ({ sido, sigungu: "" }));

    const payload: CreateTeamPayload = {
      name: form.name,
      teamType: form.teamType,
      introShort: form.introShort || undefined,
      introLong: form.introLong || undefined,
      isNationwide: form.isNationwide,
      regions,
      equipment: form.equipment,
      portfolio: form.portfolio
        .filter((p) => p.title.trim())
        .map((p) => ({
          title: p.title,
          description: p.description || undefined,
          startDate: p.startDate || undefined,
          endDate: p.endDate || undefined,
          imageUrls: p.imageUrl ? [p.imageUrl] : [],
        })),
      desiredPayMin: form.desiredPayMin ? Number(form.desiredPayMin) : undefined,
      desiredPayMax: form.desiredPayMax ? Number(form.desiredPayMax) : undefined,
      desiredPayUnit: form.payUnit || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      headcountTarget: form.headcountTarget
        ? Number(form.headcountTarget)
        : undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() =>
              step === 0 ? router.back() : setStep((s) => s - 1)
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 transition-colors hover:bg-neutral-200"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950">
              팀 만들기
            </h1>
            <p className="text-xs text-neutral-500">
              {step + 1}단계 / {STEPS.length}
            </p>
          </div>
        </div>

        {/* Progress */}
        <ProgressIndicator steps={progressSteps} />

        {/* Form */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md">
          <h2 className="mb-5 text-base font-bold text-neutral-800">
            {STEPS[step]}
          </h2>

          {step === 0 && <Step1 form={form} setForm={setForm} />}
          {step === 1 && <Step2 form={form} setForm={setForm} />}
          {step === 2 && <Step3 form={form} setForm={setForm} />}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-4 flex gap-2">
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-4 text-sm font-semibold text-white transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-[0.98]"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex flex-1 items-center justify-center rounded-lg bg-primary-500 py-4 text-sm font-semibold text-white transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-[0.98]"
            >
              {createMutation.isPending ? "생성 중..." : "팀 만들기"}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
