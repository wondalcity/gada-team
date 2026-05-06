import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { ok, unauthorized, notFound, badRequest, serverError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { publicId } = await params;
    const body = await req.json();
    const { status, adminNote } = body;

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
      console.error("[admin/charges/:id PATCH] update error:", updateErr);
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

    // Log admin action
    await db.from("audit_logs").insert({
      admin_user_id: principal.userId,
      action: `${status}_CHARGE_REQUEST`,
      entity_type: "point_charge_requests",
      entity_id: charge.id,
      note: adminNote ?? `Charge request ${status.toLowerCase()}`,
    });

    return ok(updated);
  } catch (err) {
    console.error("[admin/charges/:id PATCH] error:", err);
    return serverError();
  }
}
