import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const db = createAdminClient();

    const { data: profile } = await db
      .from("employer_profiles")
      .select("company_id")
      .eq("user_id", principal.userId)
      .not("company_id", "is", null)
      .maybeSingle();

    if (!profile?.company_id) {
      return notFound("등록된 회사가 없습니다");
    }

    const { data: company, error } = await db
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();

    if (error || !company) return notFound("회사를 찾을 수 없습니다");

    return ok(company);
  } catch (err) {
    console.error("[companies/mine GET] error:", err);
    return serverError();
  }
}
