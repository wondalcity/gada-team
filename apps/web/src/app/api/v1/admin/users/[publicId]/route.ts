import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { ok, unauthorized, notFound, serverError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: user, error } = await db
      .from("users")
      .select(
        `id, public_id, phone, role, status, email, firebase_uid, created_at,
         worker_profiles(id, public_id, full_name, birth_date, nationality, visa_type,
           health_check_status, profile_image_url, bio, desired_pay_min, desired_pay_max, desired_pay_unit),
         employer_profiles(id, public_id, full_name, role, email, phone, company_id,
           companies(id, public_id, name, status, is_verified, business_registration_number)
         )`
      )
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .single();

    if (error || !user) return notFound("사용자를 찾을 수 없습니다");

    return ok(user);
  } catch (err) {
    console.error("[admin/users GET detail] error:", err);
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
    const { status, role, adminNote } = body;

    const db = createAdminClient();

    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .single();

    if (!user) return notFound("사용자를 찾을 수 없습니다");

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;

    const { data: updated, error } = await db
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[admin/users PATCH] update error:", error);
      return serverError();
    }

    // Log admin action
    if (adminNote || Object.keys(updateData).length > 0) {
      await db.from("audit_logs").insert({
        admin_user_id: principal.userId,
        action: "UPDATE_USER",
        entity_type: "users",
        entity_id: user.id,
        note: adminNote ?? `Updated: ${JSON.stringify(updateData)}`,
      });
    }

    return ok(updated);
  } catch (err) {
    console.error("[admin/users PATCH] error:", err);
    return serverError();
  }
}
