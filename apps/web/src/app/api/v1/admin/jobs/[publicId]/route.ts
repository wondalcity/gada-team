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

    const { data: job, error } = await db
      .from("jobs")
      .select(
        `id, public_id, title, description, status, pay_min, pay_max, pay_unit,
         required_count, application_types, always_open, start_date, end_date,
         accommodation_provided, meal_provided, transportation_provided,
         health_check_required, view_count, application_count, created_at,
         sites!inner(id, public_id, name, address, address_detail, sido, sigungu,
           latitude, longitude, start_date, end_date, description,
           companies!inner(id, public_id, name, status, is_verified, ceo_name, phone, email)
         )`
      )
      .eq("public_id", publicId)
      .single();

    if (error || !job) return notFound("공고를 찾을 수 없습니다");

    return ok(job);
  } catch (err) {
    console.error("[admin/jobs GET detail] error:", err);
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

    const db = createAdminClient();

    const { data: job } = await db
      .from("jobs")
      .select("id")
      .eq("public_id", publicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");

    const {
      title,
      description,
      status,
      payMin,
      payMax,
      payUnit,
      requiredCount,
      alwaysOpen,
      startDate,
      endDate,
      accommodationProvided,
      mealProvided,
      transportationProvided,
      healthCheckRequired,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (payMin !== undefined) updateData.pay_min = payMin;
    if (payMax !== undefined) updateData.pay_max = payMax;
    if (payUnit !== undefined) updateData.pay_unit = payUnit;
    if (requiredCount !== undefined) updateData.required_count = requiredCount;
    if (alwaysOpen !== undefined) updateData.always_open = alwaysOpen;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (accommodationProvided !== undefined) updateData.accommodation_provided = accommodationProvided;
    if (mealProvided !== undefined) updateData.meal_provided = mealProvided;
    if (transportationProvided !== undefined) updateData.transportation_provided = transportationProvided;
    if (healthCheckRequired !== undefined) updateData.health_check_required = healthCheckRequired;

    const { data: updated, error } = await db
      .from("jobs")
      .update(updateData)
      .eq("id", job.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[admin/jobs PATCH] update error:", error);
      return serverError();
    }

    // Log admin action
    await db.from("audit_logs").insert({
      admin_user_id: principal.userId,
      action: "UPDATE_JOB",
      entity_type: "jobs",
      entity_id: job.id,
      note: `Updated: ${JSON.stringify(updateData)}`,
    });

    return ok(updated);
  } catch (err) {
    console.error("[admin/jobs PATCH] error:", err);
    return serverError();
  }
}
