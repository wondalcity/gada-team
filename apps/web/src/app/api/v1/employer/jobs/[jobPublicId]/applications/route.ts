import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  unauthorized,
  forbidden,
  notFound,
  serverError,
  paginated,
} from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobPublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { jobPublicId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    // Find job and verify employer ownership
    const { data: job } = await db
      .from("jobs")
      .select(
        `id, public_id, title,
         sites!inner(company_id, companies!inner(id))`
      )
      .eq("public_id", jobPublicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");

    // Verify employer owns the company
    const site = (job as Record<string, unknown>).sites as { company_id: number };
    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .eq("company_id", site.company_id)
      .maybeSingle();

    if (!profile) return forbidden("이 공고에 대한 권한이 없습니다");

    let query = db
      .from("applications")
      .select(
        `id, public_id, application_type, status, cover_letter, employer_note,
         is_scouted, is_verified, created_at,
         users!inner(id, public_id, phone,
           worker_profiles(id, full_name, birth_date, nationality, visa_type, profile_image_url)
         )`,
        { count: "exact" }
      )
      .eq("job_id", job.id);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[job applications GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((app) => ({
      publicId: app.public_id,
      jobTitle: (job as Record<string, unknown>).title as string,
      jobPublicId: jobPublicId,
      companyName: "",
      applicationType: app.application_type,
      status: app.status,
      statusUpdatedAt: app.created_at,
      isScouted: app.is_scouted ?? false,
      isVerified: app.is_verified ?? false,
      appliedAt: app.created_at,
    }));

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[job applications GET] error:", err);
    return serverError();
  }
}
