import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { created, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ publicId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER" && principal.role !== "ADMIN") {
      return forbidden("근로자만 지원할 수 있습니다");
    }

    const { publicId } = await params;
    const body = await req.json();
    const { applicationType = "INDIVIDUAL", coverLetter } = body;

    const db = createAdminClient();

    // Fetch the job
    const { data: job } = await db
      .from("jobs")
      .select("id, status, application_count")
      .eq("public_id", publicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");
    if (job.status !== "PUBLISHED") {
      return badRequest("지원할 수 없는 공고입니다");
    }

    // Check for duplicate application
    const { data: existing } = await db
      .from("applications")
      .select("id")
      .eq("job_id", job.id)
      .eq("user_id", principal.userId)
      .single();

    if (existing) {
      return badRequest("이미 지원한 공고입니다");
    }

    // Create application
    const { data: application, error } = await db
      .from("applications")
      .insert({
        job_id: job.id,
        user_id: principal.userId,
        application_type: applicationType,
        status: "PENDING",
        cover_letter: coverLetter ?? null,
        is_scouted: false,
      })
      .select(`*, jobs(id, public_id, title, sites(name, companies(name)))`)
      .single();

    if (error || !application) {
      console.error("[jobs/[publicId]/apply POST] insert error:", error);
      return serverError("지원에 실패했습니다");
    }

    // Increment application_count (fire-and-forget)
    db.from("jobs")
      .update({ application_count: (job.application_count ?? 0) + 1 })
      .eq("id", job.id)
      .then(() => {});

    return created(application);
  } catch (err) {
    console.error("[jobs/[publicId]/apply POST] error:", err);
    return serverError();
  }
}
