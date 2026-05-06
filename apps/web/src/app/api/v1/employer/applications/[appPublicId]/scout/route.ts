import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appPublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 스카우트할 수 있습니다");

    const { appPublicId } = await params;
    const db = createAdminClient();

    const { data: application, error: findErr } = await db
      .from("applications")
      .select(
        `id, public_id, is_scouted,
         jobs!inner(sites!inner(company_id))`
      )
      .eq("public_id", appPublicId)
      .single();

    if (findErr || !application) return notFound("지원을 찾을 수 없습니다");

    if (application.is_scouted) return badRequest("이미 스카우트된 지원자입니다");

    // Verify employer owns the company
    const job = (application as Record<string, unknown>).jobs as {
      sites: { company_id: number };
    };
    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .eq("company_id", job.sites.company_id)
      .maybeSingle();

    if (!profile) return forbidden("이 지원에 대한 권한이 없습니다");

    // Insert into scouts table
    const { data: scout, error: scoutErr } = await db
      .from("scouts")
      .insert({
        application_id: application.id,
        employer_user_id: principal.userId,
      })
      .select()
      .single();

    if (scoutErr || !scout) {
      console.error("[scout POST] insert error:", scoutErr);
      return serverError();
    }

    // Update application is_scouted flag
    await db
      .from("applications")
      .update({ is_scouted: true })
      .eq("id", application.id);

    return ok(scout);
  } catch (err) {
    console.error("[scout POST] error:", err);
    return serverError();
  }
}
