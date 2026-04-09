import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse } from "@/lib/api";

interface AuthState {
  user: AuthResponse | null;
  setUser: (user: AuthResponse | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    {
      name: "gada-auth",
      // Only persist non-sensitive display fields; token is managed by Firebase SDK
      partialize: (state) => ({ user: state.user }),
    }
  )
);
