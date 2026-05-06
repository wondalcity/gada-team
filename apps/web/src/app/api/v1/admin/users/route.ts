import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { unauthorized, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";
    const role = searchParams.get("role") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("users")
      .select(
        `id, public_id, phone, role, status, email, created_at,
         worker_profiles(id, full_name, nationality, visa_type, profile_image_url),
         employer_profiles(id, full_name, role, company_id,
           companies(id, public_id, name, status)
         )`,
        { count: "exact" }
      )
      .is("deleted_at", null);

    if (keyword) {
      query = query.or(`phone.ilike.%${keyword}%,email.ilike.%${keyword}%`);
    }
    if (role) {
      query = query.eq("role", role);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[admin/users GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[admin/users GET] error:", err);
    return serverError();
  }
}
