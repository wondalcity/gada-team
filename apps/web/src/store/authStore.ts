import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse } from "@/lib/api";

type ViewMode = "WORKER" | "TEAM_LEADER";

interface AuthState {
  user: AuthResponse | null;
  /** JWT token for password-based auth (null when using Firebase OTP) */
  token: string | null;
  /**
   * Active view mode for TEAM_LEADER users who can switch between
   * worker mode and leader mode. null = use user.role as-is.
   */
  activeMode: ViewMode | null;
  setUser: (user: AuthResponse | null) => void;
  setToken: (token: string | null) => void;
  setActiveMode: (mode: ViewMode) => void;
  clear: () => void;
  /** Resolved mode: for TEAM_LEADER returns activeMode, otherwise user.role */
  getEffectiveRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeMode: null,
      setUser: (user) =>
        set((state) => ({
          user,
          token: user?.token ?? null,
          // When role changes away from TEAM_LEADER, reset activeMode
          activeMode:
            user?.role === "TEAM_LEADER"
              ? (state.activeMode ?? "TEAM_LEADER")
              : null,
        })),
      setToken: (token) => set({ token }),
      setActiveMode: (mode) => set({ activeMode: mode }),
      clear: () => set({ user: null, token: null, activeMode: null }),
      getEffectiveRole: () => {
        const { user, activeMode } = get();
        if (!user) return null;
        if (user.role === "TEAM_LEADER" && activeMode) return activeMode;
        return user.role;
      },
    }),
    {
      name: "gada-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        activeMode: state.activeMode,
      }),
    }
  )
);
