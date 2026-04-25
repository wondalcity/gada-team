import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse } from "@/lib/api";

interface AuthState {
  user: AuthResponse | null;
  /** JWT token for password-based auth (null when using Firebase OTP) */
  token: string | null;
  setUser: (user: AuthResponse | null) => void;
  setToken: (token: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user, token: user?.token ?? null }),
      setToken: (token) => set({ token }),
      clear: () => set({ user: null, token: null }),
    }),
    {
      name: "gada-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
