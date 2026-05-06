import { NextRequest } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { ok, badRequest, serverError } from "@/lib/api-response";

function getAdminApp() {
  if (getApps().find((a) => a.name === "admin")) {
    return getApps().find((a) => a.name === "admin")!;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return initializeApp({ credential: cert(JSON.parse(json)) }, "admin");
  }
  return initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    },
    "admin"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return badRequest("idToken은 필수입니다");
    }

    let decoded;
    try {
      decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    } catch {
      return badRequest("유효하지 않은 Firebase 토큰입니다");
    }

    const phone = decoded.phone_number ?? null;
    const firebaseUid = decoded.uid;

    const db = createAdminClient();

    // Check if user exists
    const { data: existingUser } = await db
      .from("users")
      .select("id, public_id, phone, role, firebase_uid, email")
      .eq("firebase_uid", firebaseUid)
      .is("deleted_at", null)
      .single();

    if (existingUser) {
      return ok({
        userId: existingUser.id,
        publicId: existingUser.public_id,
        phone: existingUser.phone,
        role: existingUser.role,
        isNewUser: false,
        token: idToken,
      });
    }

    // New user — create record
    const { data: newUser, error } = await db
      .from("users")
      .insert({
        firebase_uid: firebaseUid,
        phone: phone,
        role: "WORKER",
        status: "ACTIVE",
        email: decoded.email ?? null,
      })
      .select("id, public_id, phone, role, firebase_uid, email")
      .single();

    if (error || !newUser) {
      console.error("[auth/login] insert error:", error);
      return serverError("사용자 생성에 실패했습니다");
    }

    return ok({
      userId: newUser.id,
      publicId: newUser.public_id,
      phone: newUser.phone,
      role: newUser.role,
      isNewUser: true,
      token: idToken,
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return serverError();
  }
}
