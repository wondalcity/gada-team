import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const body = await req.json();
    const { paymentKey, orderId, amountKrw } = body;

    if (!paymentKey) return badRequest("paymentKey는 필수입니다");
    if (!orderId) return badRequest("orderId는 필수입니다");
    if (!amountKrw || amountKrw <= 0) return badRequest("충전 금액은 0보다 커야 합니다");

    const db = createAdminClient();

    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .maybeSingle();

    if (!profile) return forbidden("고용주 프로필이 없습니다");

    // Get or create point account
    let accountId: number;
    const { data: existing } = await db
      .from("employer_point_accounts")
      .select("id, balance, total_charged")
      .eq("employer_profile_id", profile.id)
      .maybeSingle();

    if (existing) {
      accountId = existing.id;
    } else {
      const { data: newAccount, error: createErr } = await db
        .from("employer_point_accounts")
        .insert({ employer_profile_id: profile.id, balance: 0, total_charged: 0, total_used: 0 })
        .select("id, balance, total_charged")
        .single();

      if (createErr || !newAccount) {
        console.error("[card-confirm POST] create account error:", createErr);
        return serverError();
      }
      accountId = newAccount.id;
    }

    const pointsToAdd = amountKrw;
    const currentBalance = existing?.balance ?? 0;
    const currentTotalCharged = existing?.total_charged ?? 0;

    // Create APPROVED charge request
    const { data: charge, error: chargeErr } = await db
      .from("point_charge_requests")
      .insert({
        employer_point_account_id: accountId,
        amount_krw: amountKrw,
        points_to_add: pointsToAdd,
        payment_method: "CARD",
        status: "APPROVED",
        admin_note: `Toss Payments confirmed — paymentKey: ${paymentKey}, orderId: ${orderId}`,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (chargeErr || !charge) {
      console.error("[card-confirm POST] charge insert error:", chargeErr);
      return serverError();
    }

    // Update point balance
    const { error: balanceErr } = await db
      .from("employer_point_accounts")
      .update({
        balance: currentBalance + pointsToAdd,
        total_charged: currentTotalCharged + pointsToAdd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (balanceErr) {
      console.error("[card-confirm POST] balance update error:", balanceErr);
      return serverError();
    }

    return ok({
      charge,
      newBalance: currentBalance + pointsToAdd,
    });
  } catch (err) {
    console.error("[card-confirm POST] error:", err);
    return serverError();
  }
}
