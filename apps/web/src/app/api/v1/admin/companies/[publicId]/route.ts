import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { ok, unauthorized, notFound, badRequest, serverError } from "@/lib/api-response";

const VALID_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: company, error } = await db
      .from("companies")
      .select(
        `id, public_id, name, business_registration_number, ceo_name, address, phone, email,
         website_url, description, status, is_verified, admin_note, rejection_reason, created_at,
         sites(id, public_id, name, address, status, created_at),
         employer_profiles!inner(id, full_name, role,
           users!inner(id, public_id, phone, email, role, status)
         )`
      )
      .eq("public_id", publicId)
      .single();

    if (error || !company) return notFound("회사를 찾을 수 없습니다");

    return ok(company);
  } catch (err) {
    console.error("[admin/companies GET detail] error:", err);
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
    const { status, adminNote, rejectionReason } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`유효하지 않은 상태입니다. 가능한 값: ${VALID_STATUSES.join(", ")}`);
    }

    const db = createAdminClient();

    const { data: company } = await db
      .from("companies")
      .select("id")
      .eq("public_id", publicId)
      .single();

    if (!company) return notFound("회사를 찾을 수 없습니다");

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (adminNote !== undefined) updateData.admin_note = adminNote;
    if (rejectionReason !== undefined) updateData.rejection_reason = rejectionReason;
    if (status === "ACTIVE") updateData.is_verified = true;

    const { data: updated, error } = await db
      .from("companies")
      .update(updateData)
      .eq("id", company.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[admin/companies PATCH] update error:", error);
      return serverError();
    }

    // Log admin action
    await db.from("audit_logs").insert({
      admin_user_id: principal.userId,
      action: `UPDATE_COMPANY_STATUS_${status ?? "INFO"}`,
      entity_type: "companies",
      entity_id: company.id,
      note: adminNote ?? rejectionReason ?? `Status changed to ${status}`,
    });

    return ok(updated);
  } catch (err) {
    console.error("[admin/companies PATCH] error:", err);
    return serverError();
  }
}
