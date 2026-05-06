import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    // Get accepted application job IDs for this user
    let appQuery = db
      .from("applications")
      .select("job_id")
      .eq("user_id", principal.userId)
      .eq("status", "ACCEPTED");

    const { data: acceptedApps, error: appError } = await appQuery;

    if (appError) {
      console.error("[worker/jobs/for-schedule GET] applications error:", appError);
      return serverError();
    }

    const jobIds = (acceptedApps ?? []).map((a: any) => a.job_id).filter(Boolean);
    if (jobIds.length === 0) return ok([]);

    let jobQuery = db
      .from("jobs")
      .select(
        `
        public_id,
        title,
        status,
        sites(
          name,
          address,
          sido,
          sigungu
        )
      `
      )
      .in("id", jobIds)
      .limit(size);

    if (keyword) {
      jobQuery = jobQuery.or(
        `title.ilike.%${keyword}%,sites.name.ilike.%${keyword}%`
      );
    }

    const { data: jobs, error: jobError2 } = await jobQuery;

    if (jobError2) {
      console.error("[worker/jobs/for-schedule GET] jobs error:", jobError2);
      return serverError();
    }

    return ok(
      (jobs ?? []).map((j: any) => ({
        jobPublicId: j.public_id,
        jobTitle: j.title,
        jobStatus: j.status,
        siteName: j.sites?.name ?? null,
        siteAddress: j.sites?.address ?? null,
        sidoSigungu: [j.sites?.sido, j.sites?.sigungu].filter(Boolean).join(" ") || null,
      }))
    );
  } catch (err) {
    console.error("[worker/jobs/for-schedule GET] error:", err);
    return serverError();
  }
}
