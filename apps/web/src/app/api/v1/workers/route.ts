import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, forbidden, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 근로자 목록을 조회할 수 있습니다");
    }

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";
    const nationality = searchParams.get("nationality") ?? "";
    const visaType = searchParams.get("visaType") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("worker_profiles")
      .select(
        `id, public_id, full_name, nationality, visa_type, profile_image_url,
         desired_pay_min, desired_pay_max, desired_pay_unit, is_team_leader,
         users!inner(id, public_id, phone, status)`,
        { count: "exact" }
      )
      .eq("users.status" as never, "ACTIVE")
      .is("users.deleted_at" as never, null);

    if (keyword) {
      query = query.ilike("full_name", `%${keyword}%`);
    }
    if (nationality) {
      query = query.eq("nationality", nationality);
    }
    if (visaType) {
      query = query.eq("visa_type", visaType);
    }

    const { data, error, count } = await query
      .order("id", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[workers GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((w) => ({
      publicId: w.public_id,
      fullName: w.full_name,
      nationality: w.nationality,
      visaType: w.visa_type,
      healthCheckStatus: "NOT_DONE",
      profileImageUrl: w.profile_image_url ?? null,
      desiredPayMin: w.desired_pay_min ?? null,
      desiredPayMax: w.desired_pay_max ?? null,
      desiredPayUnit: w.desired_pay_unit ?? null,
      isTeamLeader: w.is_team_leader ?? false,
      teamPublicId: null,
      teamName: null,
    }));

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[workers GET] error:", err);
    return serverError();
  }
}
