import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api-response";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email) return badRequest("이메일은 필수입니다");
    if (!password) return badRequest("비밀번호는 필수입니다");

    const db = createAdminClient();

    const { data: user, error } = await db
      .from("users")
      .select("id, public_id, phone, role, status, email, firebase_uid, password_hash, jwt_token_hash")
      .eq("email", email)
      .eq("role", "ADMIN")
      .is("deleted_at", null)
      .single();

    if (error || !user) {
      return unauthorized("이메일 또는 비밀번호가 올바르지 않습니다");
    }

    if (!user.password_hash) {
      return unauthorized("비밀번호가 설정되지 않은 계정입니다");
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return unauthorized("이메일 또는 비밀번호가 올바르지 않습니다");
    }

    if (user.status && user.status !== "ACTIVE") {
      return unauthorized("비활성화된 계정입니다. 관리자에게 문의하세요");
    }

    // Generate a simple token (store hash in db)
    const rawToken = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tokenHash = rawToken.slice(0, 64);

    await db
      .from("users")
      .update({ jwt_token_hash: tokenHash })
      .eq("id", user.id);

    return ok({
      token: rawToken,
      user: {
        id: user.id,
        publicId: user.public_id,
        phone: user.phone,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("[auth/admin/login POST] error:", err);
    return serverError();
  }
}
