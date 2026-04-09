"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Globe,
  MapPin,
  Wrench,
  AlertTriangle,
  Plus,
  X,
  Check,
  Save,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  teamsApi,
  UpdateTeamPayload,
  RegionEntry,
} from "@/lib/teams-api";
import { useAuthStore } from "@/store/authStore";
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
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
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
            if (e.key === "Enter") {
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

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
      {children}
    </h2>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-card-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 mx-auto">
            <AlertTriangle className="h-6 w-6 text-danger-500" />
          </div>
          <h3 className="mb-2 text-center text-base font-bold text-neutral-950">
            팀을 해산하시겠어요?
          </h3>
          <p className="mb-6 text-center text-sm text-neutral-500 leading-relaxed">
            정말 팀을 해산하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-danger-500 py-3 text-sm font-semibold text-white transition-all hover:bg-danger-700 disabled:opacity-50"
            >
              {loading ? "해산 중..." : "해산하기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Edit Form ─────────────────────────────────────────────────────────────────

function EditTeamForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [disbandOpen, setDisbandOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Form fields
  const [name, setName] = React.useState("");
  const [introShort, setIntroShort] = React.useState("");
  const [introLong, setIntroLong] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [isNationwide, setIsNationwide] = React.useState(false);
  const [selectedSido, setSelectedSido] = React.useState<string[]>([]);
  const [equipment, setEquipment] = React.useState<string[]>([]);
  const [payUnit, setPayUnit] = React.useState("DAILY");
  const [desiredPayMin, setDesiredPayMin] = React.useState("");
  const [desiredPayMax, setDesiredPayMax] = React.useState("");
  const [headcountTarget, setHeadcountTarget] = React.useState("");

  const { data: team, isLoading, isError } = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamsApi.getTeam(id),
  });

  // Pre-fill when data loads
  React.useEffect(() => {
    if (!team) return;
    setName(team.name ?? "");
    setIntroShort(team.introShort ?? "");
    setIntroLong(team.introLong ?? "");
    setCoverImageUrl(team.coverImageUrl ?? "");
    setIsNationwide(team.isNationwide ?? false);
    setSelectedSido(team.regions?.map((r) => r.sido) ?? []);
    setEquipment(team.equipment ?? []);
    setPayUnit(team.desiredPayUnit ?? "DAILY");
    setDesiredPayMin(team.desiredPayMin?.toString() ?? "");
    setDesiredPayMax(team.desiredPayMax?.toString() ?? "");
    setHeadcountTarget(team.headcountTarget?.toString() ?? "");
  }, [team]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateTeamPayload) =>
      teamsApi.updateTeam(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["team", "mine"] });
      setSaved(true);
      setTimeout(() => {
        router.push("/teams/mine");
      }, 800);
    },
    onError: (err: any) => {
      setError(err?.message || "저장에 실패했어요.");
    },
  });

  const disbandMutation = useMutation({
    mutationFn: () => teamsApi.disbandTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "mine"] });
      router.push("/teams/mine");
    },
    onError: (err: any) => {
      setError(err?.message || "팀 해산에 실패했어요.");
      setDisbandOpen(false);
    },
  });

  const handleSave = () => {
    setError(null);
    setSaved(false);
    const regions: RegionEntry[] = isNationwide
      ? []
      : selectedSido.map((sido) => ({ sido, sigungu: "" }));

    const payload: UpdateTeamPayload = {
      name: name || undefined,
      introShort: introShort || undefined,
      introLong: introLong || undefined,
      coverImageUrl: coverImageUrl || undefined,
      isNationwide,
      regions,
      equipment,
      desiredPayMin: desiredPayMin ? Number(desiredPayMin) : undefined,
      desiredPayMax: desiredPayMax ? Number(desiredPayMax) : undefined,
      desiredPayUnit: payUnit || undefined,
      headcountTarget: headcountTarget ? Number(headcountTarget) : undefined,
    };
    updateMutation.mutate(payload);
  };

  const toggleSido = (sido: string) => {
    setSelectedSido((prev) =>
      prev.includes(sido) ? prev.filter((s) => s !== sido) : [...prev, sido]
    );
  };

  // Access guard
  const isLeader = user && team ? user.userId === team.leaderId : false;

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-neutral-200"
          />
        ))}
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <AlertTriangle className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-sm font-semibold text-neutral-600">
          팀 정보를 불러올 수 없어요
        </p>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <AlertTriangle className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-sm font-semibold text-neutral-600">
          팀장만 팀을 편집할 수 있어요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6 pb-24">
        {/* Basic Info */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md space-y-4">
          <SectionHeader>기본 정보</SectionHeader>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              팀 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-700">
                간단 소개
              </label>
              <span className="text-xs text-neutral-400">
                {introShort.length}/200
              </span>
            </div>
            <textarea
              value={introShort}
              onChange={(e) => setIntroShort(e.target.value.slice(0, 200))}
              rows={3}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              상세 소개
            </label>
            <textarea
              value={introLong}
              onChange={(e) => setIntroLong(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              커버 이미지 URL
            </label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {/* Region & Equipment */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md space-y-4">
          <SectionHeader>활동 지역 & 역량</SectionHeader>

          <div className="rounded-lg border border-neutral-200 p-4">
            <ToggleSwitch
              checked={isNationwide}
              onChange={setIsNationwide}
              label="전국 활동"
            />
          </div>

          {!isNationwide && (
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                <MapPin className="h-4 w-4 text-primary-500" />
                활동 지역
              </label>
              <div className="flex flex-wrap gap-2">
                {SIDO_LIST.map((sido) => {
                  const selected = selectedSido.includes(sido);
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

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              <Wrench className="h-4 w-4 text-primary-500" />
              보유 장비
            </label>
            <TagInput
              tags={equipment}
              onChange={setEquipment}
              placeholder="예) 굴착기, 지게차"
            />
          </div>
        </div>

        {/* Recruitment */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 shadow-card-md space-y-4">
          <SectionHeader>모집 조건</SectionHeader>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              모집 인원 (명)
            </label>
            <input
              type="number"
              min={1}
              value={headcountTarget}
              onChange={(e) => setHeadcountTarget(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              급여 단위
            </label>
            <div className="flex gap-2">
              {PAY_UNITS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayUnit(value)}
                  className={cn(
                    "flex-1 rounded-lg border py-3 text-sm font-semibold transition-all",
                    payUnit === value
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              희망 급여 범위
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={desiredPayMin}
                onChange={(e) => setDesiredPayMin(e.target.value)}
                placeholder="최소"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <span className="text-neutral-400">~</span>
              <input
                type="number"
                value={desiredPayMax}
                onChange={(e) => setDesiredPayMax(e.target.value)}
                placeholder="최대"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <span className="text-sm text-neutral-500">원</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {/* Disband */}
        <div className="rounded-lg border border-danger-200 bg-danger-50/50 p-5">
          <h3 className="mb-1 text-sm font-bold text-danger-700">위험 구역</h3>
          <p className="mb-4 text-xs text-danger-500">
            팀을 해산하면 모든 팀원과의 연결이 끊어지며, 복구할 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setDisbandOpen(true)}
            className="w-full rounded-lg border border-danger-200 bg-white py-3 text-sm font-semibold text-danger-700 transition-all hover:bg-danger-50 active:scale-[0.98]"
          >
            팀 해산하기
          </button>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-100 bg-white/95 px-4 pt-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 60px)` }}
      >
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || saved}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg py-4 text-sm font-semibold transition-all active:scale-[0.98]",
            saved
              ? "bg-success-500 text-white"
              : "bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          )}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              저장 완료
            </>
          ) : updateMutation.isPending ? (
            "저장 중..."
          ) : (
            <>
              <Save className="h-4 w-4" />
              변경 사항 저장
            </>
          )}
        </button>
      </div>

      {/* Disband confirm dialog */}
      <ConfirmDialog
        open={disbandOpen}
        onConfirm={() => disbandMutation.mutate()}
        onCancel={() => setDisbandOpen(false)}
        loading={disbandMutation.isPending}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 px-4 pt-5 pb-2">
          <a
            href={`/teams/${id}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 transition-colors hover:bg-neutral-200"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-600" />
          </a>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950">팀 편집</h1>
            <p className="text-xs text-neutral-500">팀 정보를 수정하세요</p>
          </div>
        </div>
        <EditTeamForm id={id} />
      </div>
    </AppLayout>
  );
}
