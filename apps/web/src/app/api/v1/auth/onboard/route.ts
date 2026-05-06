import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, badRequest, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();

    const body = await req.json();
    const {
      role,
      fullName,
      birthDate,
      nationality,
      profileImageUrl,
      visaType,
      desiredPayMin,
      desiredPayMax,
      desiredPayUnit,
    } = body;

    if (!role || !["WORKER", "EMPLOYER"].includes(role)) {
      return badRequest("role은 WORKER 또는 EMPLOYER이어야 합니다");
    }
    if (!fullName) {
      return badRequest("fullName은 필수입니다");
    }

    const db = createAdminClient();

    // Update user role and full_name
    const { data: updatedUser, error: userError } = await db
      .from("users")
      .update({ role, full_name: fullName })
      .eq("firebase_uid", principal.firebaseUid)
      .select("id, public_id, phone, role, firebase_uid, email, full_name")
      .single();

    if (userError || !updatedUser) {
      console.error("[auth/onboard] user update error:", userError);
      return serverError("사용자 정보 업데이트에 실패했습니다");
    }

    const userId = updatedUser.id;

    if (role === "WORKER") {
      // Upsert worker_profiles
      const { error: profileError } = await db
        .from("worker_profiles")
        .upsert(
          {
            user_id: userId,
            full_name: fullName,
            birth_date: birthDate ?? null,
            nationality: nationality ?? null,
            profile_image_url: profileImageUrl ?? null,
            visa_type: visaType ?? null,
            desired_pay_min: desiredPayMin ?? null,
            desired_pay_max: desiredPayMax ?? null,
            desired_pay_unit: desiredPayUnit ?? null,
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        console.error("[auth/onboard] worker_profiles upsert error:", profileError);
        return serverError("워커 프로필 생성에 실패했습니다");
      }
    } else if (role === "EMPLOYER") {
      // Upsert employer_profiles (without company_id for now)
      const { error: profileError } = await db
        .from("employer_profiles")
        .upsert(
          {
            user_id: userId,
            full_name: fullName,
            role: "OWNER",
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        console.error("[auth/onboard] employer_profiles upsert error:", profileError);
        return serverError("고용주 프로필 생성에 실패했습니다");
      }
    }

    return ok({
      userId: updatedUser.id,
      publicId: updatedUser.public_id,
      phone: updatedUser.phone,
      role: updatedUser.role,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
    });
  } catch (err) {
    console.error("[auth/onboard] error:", err);
    return serverError();
  }
}
