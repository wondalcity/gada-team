import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ publicId: string }> };

const VALID_STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "ARCHIVED"];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 공고 상태를 변경할 수 있습니다");
    }

    const { publicId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return badRequest(`status는 ${VALID_STATUSES.join(", ")} 중 하나여야 합니다`);
    }

    const db = createAdminClient();

    const { data: job } = await db
      .from("jobs")
      .select("id, sites!inner(company_id)")
      .eq("public_id", publicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");

    if (principal.role !== "ADMIN") {
      const { data: employerProfile } = await db
        .from("employer_profiles")
        .select("company_id")
        .eq("user_id", principal.userId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const siteCompanyId = (job.sites as any)?.company_id;
      if (!employerProfile || employerProfile.company_id !== siteCompanyId) {
        return forbidden("해당 공고에 대한 권한이 없습니다");
      }
    }

    const { data: updated, error } = await db
      .from("jobs")
      .update({ status })
      .eq("public_id", publicId)
      .select("id, public_id, title, status")
      .single();

    if (error || !updated) {
      console.error("[jobs/[publicId]/status PATCH] error:", error);
      return serverError("공고 상태 변경에 실패했습니다");
    }

    return ok(updated);
  } catch (err) {
    console.error("[jobs/[publicId]/status PATCH] error:", err);
    return serverError();
  }
}
