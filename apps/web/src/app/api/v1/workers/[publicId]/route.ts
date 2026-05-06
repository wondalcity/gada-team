import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ publicId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 근로자 프로필을 조회할 수 있습니다");
    }

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: profile, error } = await db
      .from("worker_profiles")
      .select(
        `id, public_id, full_name, birth_date, nationality, visa_type,
         health_check_status, profile_image_url, bio,
         desired_pay_min, desired_pay_max, desired_pay_unit, is_team_leader,
         users!inner(id, public_id, phone, status, email)`
      )
      .eq("public_id", publicId)
      .is("users.deleted_at" as never, null)
      .single();

    if (error || !profile) return notFound("근로자 프로필을 찾을 수 없습니다");

    return ok(profile);
  } catch (err) {
    console.error("[workers/[publicId] GET] error:", err);
    return serverError();
  }
}
