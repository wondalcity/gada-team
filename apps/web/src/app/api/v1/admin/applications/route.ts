import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { unauthorized, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const jobPublicId = searchParams.get("jobPublicId") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("applications")
      .select(
        `id, public_id, application_type, status, cover_letter, employer_note,
         is_scouted, is_verified, created_at,
         jobs!inner(id, public_id, title,
           sites!inner(company_id,
             companies!inner(id, public_id, name)
           )
         ),
         users!inner(id, public_id, phone,
           worker_profiles(id, full_name, nationality, visa_type, profile_image_url)
         )`,
        { count: "exact" }
      );

    if (status) {
      query = query.eq("status", status);
    }
    if (jobPublicId) {
      query = query.eq("jobs.public_id" as never, jobPublicId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[admin/applications GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[admin/applications GET] error:", err);
    return serverError();
  }
}
