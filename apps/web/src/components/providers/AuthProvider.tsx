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
        clear();
        return;
      }
      // If we already have the user loaded, nothing to do
      if (user) return;

      // Re-sync after page refresh
      try {
        const idToken = await firebaseUser.getIdToken();
        const authData = await loginWithToken(idToken);
        setUser(authData);
      } catch {
        // Silently ignore — user might be navigating to /login
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
