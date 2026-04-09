import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "ko" | "en" | "vi";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "ko",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "gada-locale" }
  )
);
