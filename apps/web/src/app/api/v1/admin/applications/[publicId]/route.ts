import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { ok, unauthorized, notFound, badRequest, serverError } from "@/lib/api-response";

const VALID_STATUSES = [
  "PENDING",
  "REVIEWING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "WITHDRAWN",
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: application, error } = await db
      .from("applications")
      .select(
        `id, public_id, application_type, status, cover_letter, employer_note,
         is_scouted, is_verified, created_at,
         jobs!inner(id, public_id, title, pay_min, pay_max, pay_unit,
           sites!inner(id, public_id, name, address, sido, sigungu,
             companies!inner(id, public_id, name)
           )
         ),
         users!inner(id, public_id, phone, email,
           worker_profiles(id, public_id, full_name, birth_date, nationality, visa_type,
             health_check_status, profile_image_url, bio, desired_pay_min, desired_pay_max, desired_pay_unit)
         )`
      )
      .eq("public_id", publicId)
      .single();

    if (error || !application) return notFound("지원을 찾을 수 없습니다");

    return ok(application);
  } catch (err) {
    console.error("[admin/applications GET detail] error:", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { publicId } = await params;
    const body = await req.json();
    const { status, note } = body;

    if (!status) return badRequest("status는 필수입니다");
    if (!VALID_STATUSES.includes(status)) {
      return badRequest(`유효하지 않은 상태입니다. 가능한 값: ${VALID_STATUSES.join(", ")}`);
    }

    const db = createAdminClient();

    const { data: application } = await db
      .from("applications")
      .select("id, status")
      .eq("public_id", publicId)
      .single();

    if (!application) return notFound("지원을 찾을 수 없습니다");

    // Insert status history
    await db.from("application_status_history").insert({
      application_id: application.id,
      from_status: application.status,
      to_status: status,
      note: note ?? null,
    });

    const { data: updated, error } = await db
      .from("applications")
      .update({ status, employer_note: note ?? null })
      .eq("id", application.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[admin/applications PATCH] update error:", error);
      return serverError();
    }

    return ok(updated);
  } catch (err) {
    console.error("[admin/applications PATCH] error:", err);
    return serverError();
  }
}
