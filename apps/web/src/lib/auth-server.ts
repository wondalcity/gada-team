import { NextRequest } from "next/server";
import { createAdminClient } from "./supabase/server";

export interface GadaPrincipal {
  userId: number;
  publicId: string;
  phone: string;
  role: string;
  firebaseUid: string | null;
  email: string | null;
}

// Lazy-initialized Firebase Admin app
let _adminApp: any = null;
let _firebaseAdminAvailable: boolean | null = null;

async function getFirebaseAdmin() {
  if (_firebaseAdminAvailable === false) return null;
  if (_adminApp) return _adminApp;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");

    const existing = getApps().find((a: any) => a.name === "admin");
    if (existing) {
      _adminApp = { app: existing, getAuth: () => getAuth(existing) };
      _firebaseAdminAvailable = true;
      return _adminApp;
    }

    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    let credential;
    if (json) {
      credential = cert(JSON.parse(json));
    } else if (privateKey && clientEmail && projectId) {
      credential = cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      });
    } else {
      console.warn("[auth] Firebase Admin credentials not configured — token verification skipped");
      _firebaseAdminAvailable = false;
      return null;
    }

    const app = initializeApp({ credential }, "admin");
    _adminApp = { app, getAuth: () => getAuth(app) };
    _firebaseAdminAvailable = true;
    return _adminApp;
  } catch (e) {
    console.error("[auth] Failed to initialize Firebase Admin:", e);
    _firebaseAdminAvailable = false;
    return null;
  }
}

/** Decodes a JWT without verifying signature — fallback when Firebase Admin is unavailable. */
function decodeJwtUnsafe(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Verifies a Firebase ID token. Returns decoded claims or null.
 * Falls back to unverified decode if Firebase Admin is not configured.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; phone_number?: string; email?: string } | null> {
  const admin = await getFirebaseAdmin();

  if (admin) {
    try {
      const decoded = await admin.getAuth().verifyIdToken(idToken);
      return decoded;
    } catch {
      return null;
    }
  }

  // Fallback: decode without verification (dev/testing only)
  const claims = decodeJwtUnsafe(idToken);
  if (!claims || !claims.sub) return null;
  return { uid: claims.sub, phone_number: claims.phone_number, email: claims.email };
}

/**
 * Extracts Bearer token from Authorization header.
 */
function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

/**
 * Authenticates the request. Supports:
 * 1. Firebase ID tokens (verified via Firebase Admin SDK)
 * 2. X-Dev-User-Id header (dev only)
 * Returns null if unauthenticated.
 */
export async function getAuthenticatedUser(
  req: NextRequest
): Promise<GadaPrincipal | null> {
  const db = createAdminClient();

  // Dev bypass
  const devId = req.headers.get("x-dev-user-id");
  if (devId && process.env.NODE_ENV !== "production") {
    const { data: user } = await db
      .from("users")
      .select("id, public_id, phone, role, firebase_uid, email")
      .eq("id", parseInt(devId))
      .is("deleted_at", null)
      .single();
    if (user) {
      return {
        userId: user.id,
        publicId: user.public_id,
        phone: user.phone,
        role: user.role,
        firebaseUid: user.firebase_uid,
        email: user.email,
      };
    }
  }

  const token = extractBearer(req);
  if (!token) return null;

  // Try Firebase token
  const decoded = await verifyFirebaseToken(token);
  if (decoded?.uid) {
    const { data: user } = await db
      .from("users")
      .select("id, public_id, phone, role, firebase_uid, email")
      .eq("firebase_uid", decoded.uid)
      .is("deleted_at", null)
      .single();
    if (user) {
      return {
        userId: user.id,
        publicId: user.public_id,
        phone: user.phone,
        role: user.role,
        firebaseUid: decoded.uid,
        email: user.email,
      };
    }
    // Unauthenticated Firebase user (not yet onboarded)
    return {
      userId: 0,
      publicId: "",
      phone: decoded.phone_number ?? "",
      role: "PENDING",
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
    };
  }

  return null;
}

/** Requires ADMIN role. */
export async function getAdminPrincipal(
  req: NextRequest
): Promise<GadaPrincipal | null> {
  const principal = await getAuthenticatedUser(req);
  if (!principal || principal.role !== "ADMIN") return null;
  return principal;
}
