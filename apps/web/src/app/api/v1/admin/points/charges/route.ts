import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { ok, unauthorized, notFound, badRequest, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "PENDING";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("point_charge_requests")
      .select(
        `id, public_id, amount_krw, points_to_add, payment_method, status,
         admin_note, reviewed_at, created_at,
         employer_point_accounts!inner(id,
           employer_profiles!inner(id, full_name,
             users!inner(id, public_id, phone, email)
           )
         )`,
        { count: "exact" }
      );

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[admin/charges GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[admin/charges GET] error:", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const body = await req.json();
    const { publicId, status, adminNote } = body;

    if (!publicId) return badRequest("publicId는 필수입니다");
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return badRequest("status는 APPROVED 또는 REJECTED여야 합니다");
    }

    const db = createAdminClient();

    const { data: charge } = await db
      .from("point_charge_requests")
      .select("id, status, points_to_add, employer_point_account_id")
      .eq("public_id", publicId)
      .single();

    if (!charge) return notFound("충전 요청을 찾을 수 없습니다");
    if (charge.status !== "PENDING") return badRequest("이미 처리된 요청입니다");

    const { data: updated, error: updateErr } = await db
      .from("point_charge_requests")
      .update({
        status,
        admin_note: adminNote ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", charge.id)
      .select()
      .single();

    if (updateErr || !updated) {
      console.error("[admin/charges PATCH] update error:", updateErr);
      return serverError();
    }

    // If APPROVED, update point balance
    if (status === "APPROVED") {
      const { data: account } = await db
        .from("employer_point_accounts")
        .select("balance, total_charged")
        .eq("id", charge.employer_point_account_id)
        .single();

      if (account) {
        await db
          .from("employer_point_accounts")
          .update({
            balance: account.balance + charge.points_to_add,
            total_charged: account.total_charged + charge.points_to_add,
            updated_at: new Date().toISOString(),
          })
          .eq("id", charge.employer_point_account_id);
      }
    }

    return ok(updated);
  } catch (err) {
    console.error("[admin/charges PATCH] error:", err);
    return serverError();
  }
}
