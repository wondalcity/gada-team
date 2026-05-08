import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  created,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  paginated,
} from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .maybeSingle();

    if (!profile) return ok({ content: [], page, size, totalElements: 0, totalPages: 0 });

    const { data: account } = await db
      .from("employer_point_accounts")
      .select("id")
      .eq("employer_profile_id", profile.id)
      .maybeSingle();

    if (!account) return paginated([], page, size, 0);

    const { data, error, count } = await db
      .from("point_charge_requests")
      .select("*", { count: "exact" })
      .eq("employer_point_account_id", account.id)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[charges GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((c) => ({
      publicId: c.public_id,
      amountKrw: c.amount_krw,
      pointsToAdd: c.points_to_add,
      paymentMethod: c.payment_method,
      status: c.status,
      adminNote: c.admin_note ?? undefined,
      reviewedAt: c.reviewed_at ?? undefined,
      createdAt: c.created_at,
    }));

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[charges GET] error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const body = await req.json();
    const { amountKrw, paymentMethod } = body;

    if (!amountKrw || amountKrw <= 0) return badRequest("충전 금액은 0보다 커야 합니다");
    if (!paymentMethod || !["CASH", "CARD"].includes(paymentMethod)) {
      return badRequest("결제 방법은 CASH 또는 CARD여야 합니다");
    }

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
      .select("id")
      .eq("employer_profile_id", profile.id)
      .maybeSingle();

    if (existing) {
      accountId = existing.id;
    } else {
      const { data: newAccount, error: createErr } = await db
        .from("employer_point_accounts")
        .insert({ employer_profile_id: profile.id, balance: 0, total_charged: 0, total_used: 0 })
        .select("id")
        .single();

      if (createErr || !newAccount) {
        console.error("[charges POST] create account error:", createErr);
        return serverError();
      }
      accountId = newAccount.id;
    }

    // Points = 1 point per 1 KRW (adjust ratio as needed)
    const pointsToAdd = amountKrw;

    const { data: charge, error } = await db
      .from("point_charge_requests")
      .insert({
        employer_point_account_id: accountId,
        amount_krw: amountKrw,
        points_to_add: pointsToAdd,
        payment_method: paymentMethod,
        status: "PENDING",
      })
      .select()
      .single();

    if (error || !charge) {
      console.error("[charges POST] insert error:", error);
      return serverError();
    }

    return created(charge);
  } catch (err) {
    console.error("[charges POST] error:", err);
    return serverError();
  }
}
