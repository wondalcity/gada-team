"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { loginWithToken } from "@/lib/api";

/**
 * Syncs Firebase auth state with our backend on each page load.
 * If the Firebase user exists but our store is empty, re-fetches the profile.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, clear } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Only wipe auth state when there's truly no session at all.
        // Do NOT clear if the user has a password-based JWT or a dev bypass in localStorage —
        // those are valid non-Firebase sessions and must survive Firebase's null event.
        const hasJwt = !!useAuthStore.getState().token;
        const hasDevBypass =
          typeof window !== "undefined" && !!localStorage.getItem("gada_dev_user_id");
        if (!hasJwt && !hasDevBypass) {
          clear();
        }
        return;
      }

      // If we already have the user loaded, nothing to do
      if (user) return;

      // Re-sync after page refresh when only Firebase state exists
      try {
        const idToken = await firebaseUser.getIdToken();
        const authData = await loginWithToken(idToken);
        setUser(authData);
      } catch {
        // Silently ignore — user might be navigating to /login,
        // or Firebase Admin SDK isn't configured in this environment.
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
