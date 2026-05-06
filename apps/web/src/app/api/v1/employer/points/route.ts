import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const db = createAdminClient();

    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .maybeSingle();

    if (!profile) {
      return ok({ balance: 0, totalCharged: 0, totalUsed: 0 });
    }

    const { data: account } = await db
      .from("employer_point_accounts")
      .select("id, public_id, balance, total_charged, total_used, updated_at")
      .eq("employer_profile_id", profile.id)
      .maybeSingle();

    if (!account) {
      return ok({ balance: 0, totalCharged: 0, totalUsed: 0 });
    }

    return ok({
      id: account.id,
      publicId: account.public_id,
      balance: account.balance,
      totalCharged: account.total_charged,
      totalUsed: account.total_used,
      updatedAt: account.updated_at,
    });
  } catch (err) {
    console.error("[employer/points GET] error:", err);
    return serverError();
  }
}
