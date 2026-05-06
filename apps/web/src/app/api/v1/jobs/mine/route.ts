import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, forbidden, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 접근할 수 있습니다");
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    // Get employer's company_id
    const { data: employerProfile } = await db
      .from("employer_profiles")
      .select("company_id")
      .eq("user_id", principal.userId)
      .single();

    if (!employerProfile?.company_id) {
      return paginated([], page, size, 0);
    }

    const { data, error, count } = await db
      .from("jobs")
      .select(
        `id, public_id, title, status, pay_min, pay_max, pay_unit, required_count,
         always_open, start_date, end_date, view_count, application_count, created_at,
         sites!inner(id, public_id, name, company_id)`,
        { count: "exact" }
      )
      .eq("sites.company_id" as never, employerProfile.company_id)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[jobs/mine GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[jobs/mine GET] error:", err);
    return serverError();
  }
}
