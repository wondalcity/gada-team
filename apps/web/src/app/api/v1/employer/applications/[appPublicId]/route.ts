import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appPublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { appPublicId } = await params;
    const db = createAdminClient();

    const { data: application, error } = await db
      .from("applications")
      .select(
        `id, public_id, application_type, status, cover_letter, employer_note,
         is_scouted, is_verified, created_at,
         jobs!inner(
           id, public_id, title,
           sites!inner(company_id, name, address,
             companies!inner(id, public_id, name)
           )
         ),
         users!inner(id, public_id, phone,
           worker_profiles(id, public_id, full_name, birth_date, nationality, visa_type,
             health_check_status, profile_image_url, bio, desired_pay_min, desired_pay_max, desired_pay_unit)
         )`
      )
      .eq("public_id", appPublicId)
      .single();

    if (error || !application) return notFound("지원을 찾을 수 없습니다");

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

    return ok(application);
  } catch (err) {
    console.error("[employer application GET] error:", err);
    return serverError();
  }
}
