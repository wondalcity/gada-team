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
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("companies")
      .select(
        `id, public_id, name, business_registration_number, ceo_name, address, phone, email,
         status, is_verified, admin_note, rejection_reason, created_at`,
        { count: "exact" }
      );

    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,business_registration_number.ilike.%${keyword}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[admin/companies GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[admin/companies GET] error:", err);
    return serverError();
  }
}
