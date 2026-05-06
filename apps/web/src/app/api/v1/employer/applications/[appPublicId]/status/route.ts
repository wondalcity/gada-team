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

const VALID_STATUSES = [
  "PENDING",
  "REVIEWING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "WITHDRAWN",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appPublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { appPublicId } = await params;
    const body = await req.json();
    const { status, note } = body;

    if (!status) return badRequest("status는 필수입니다");
    if (!VALID_STATUSES.includes(status)) {
      return badRequest(`유효하지 않은 상태입니다. 가능한 값: ${VALID_STATUSES.join(", ")}`);
    }

    const db = createAdminClient();

    const { data: application, error: findErr } = await db
      .from("applications")
      .select(
        `id, public_id, status,
         jobs!inner(sites!inner(company_id))`
      )
      .eq("public_id", appPublicId)
      .single();

    if (findErr || !application) return notFound("지원을 찾을 수 없습니다");

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

    const fromStatus = application.status;

    // Insert status history
    await db.from("application_status_history").insert({
      application_id: application.id,
      from_status: fromStatus,
      to_status: status,
      note: note ?? null,
    });

    // Update application status
    const { data: updated, error: updateErr } = await db
      .from("applications")
      .update({ status, employer_note: note ?? null })
      .eq("id", application.id)
      .select()
      .single();

    if (updateErr || !updated) {
      console.error("[application status PATCH] update error:", updateErr);
      return serverError();
    }

    return ok(updated);
  } catch (err) {
    console.error("[application status PATCH] error:", err);
    return serverError();
  }
}
