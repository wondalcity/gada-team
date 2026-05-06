import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") {
      return forbidden("근로자만 접근할 수 있습니다");
    }

    const db = createAdminClient();

    const { data: profile, error } = await db
      .from("worker_profiles")
      .select(
        `id, public_id, full_name, birth_date, nationality, visa_type,
         health_check_status, profile_image_url, bio,
         desired_pay_min, desired_pay_max, desired_pay_unit, is_team_leader`
      )
      .eq("user_id", principal.userId)
      .single();

    if (error || !profile) return notFound("워커 프로필을 찾을 수 없습니다");

    return ok(profile);
  } catch (err) {
    console.error("[workers/me GET] error:", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") {
      return forbidden("근로자만 접근할 수 있습니다");
    }

    const body = await req.json();
    const {
      fullName,
      birthDate,
      nationality,
      visaType,
      profileImageUrl,
      bio,
      desiredPayMin,
      desiredPayMax,
      desiredPayUnit,
      isTeamLeader,
    } = body;

    const db = createAdminClient();

    const updatePayload: Record<string, unknown> = {};
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (birthDate !== undefined) updatePayload.birth_date = birthDate;
    if (nationality !== undefined) updatePayload.nationality = nationality;
    if (visaType !== undefined) updatePayload.visa_type = visaType;
    if (profileImageUrl !== undefined) updatePayload.profile_image_url = profileImageUrl;
    if (bio !== undefined) updatePayload.bio = bio;
    if (desiredPayMin !== undefined) updatePayload.desired_pay_min = desiredPayMin;
    if (desiredPayMax !== undefined) updatePayload.desired_pay_max = desiredPayMax;
    if (desiredPayUnit !== undefined) updatePayload.desired_pay_unit = desiredPayUnit;
    if (isTeamLeader !== undefined) updatePayload.is_team_leader = isTeamLeader;

    const { data: profile, error } = await db
      .from("worker_profiles")
      .update(updatePayload)
      .eq("user_id", principal.userId)
      .select(
        `id, public_id, full_name, birth_date, nationality, visa_type,
         health_check_status, profile_image_url, bio,
         desired_pay_min, desired_pay_max, desired_pay_unit, is_team_leader`
      )
      .single();

    if (error || !profile) {
      console.error("[workers/me PATCH] update error:", error);
      return serverError("프로필 업데이트에 실패했습니다");
    }

    return ok(profile);
  } catch (err) {
    console.error("[workers/me PATCH] error:", err);
    return serverError();
  }
}
