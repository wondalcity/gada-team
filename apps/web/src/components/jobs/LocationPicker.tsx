"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  radius?: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  onClear: () => void;
}

const RADIUS_OPTIONS = [
  { value: 3, label: "3km" },
  { value: 5, label: "5km" },
  { value: 10, label: "10km" },
  { value: 25, label: "25km" },
  { value: 50, label: "50km" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationPicker({
  lat,
  lng,
  radius,
  onLocationChange,
  onRadiusChange,
  onClear,
}: LocationPickerProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocation = lat != null && lng != null;

  function handleGetLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError(t("filter.locationUnsupported"));
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(
          Math.round(pos.coords.latitude * 10000) / 10000,
          Math.round(pos.coords.longitude * 10000) / 10000,
        );
        setLoading(false);
      },
      () => {
        setError(t("filter.locationError"));
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <div className="space-y-3">
      {/* GPS button */}
      <button
        type="button"
        onClick={handleGetLocation}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
          hasLocation
            ? "border-primary-500 bg-primary-50 text-primary-500"
            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        {loading ? t("filter.locationLoading") : hasLocation ? t("filter.locationSet") : t("filter.locationBtn")}
      </button>

      {error && <p className="text-xs text-danger-500">{error}</p>}

      {/* Radius selector — only shown when location is set */}
      {hasLocation && (
        <div>
          <p className="text-xs text-neutral-500 mb-2">{t("filter.locationRadius")}</p>
          <div className="flex gap-2 flex-wrap">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRadiusChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  radius === opt.value
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="mt-2 text-xs text-neutral-400 hover:text-neutral-600 underline"
          >
            {t("filter.locationClear")}
          </button>
        </div>
      )}
    </div>
  );
}
