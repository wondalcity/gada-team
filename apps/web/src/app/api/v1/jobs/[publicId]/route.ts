import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, noContent, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ publicId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { publicId } = await params;
    const db = createAdminClient();

    const { data: job, error } = await db
      .from("jobs")
      .select(`*, sites(*, companies(*))`)
      .eq("public_id", publicId)
      .single();

    if (error || !job) return notFound("공고를 찾을 수 없습니다");

    // Increment view_count (fire-and-forget)
    db.from("jobs")
      .update({ view_count: (job.view_count ?? 0) + 1 })
      .eq("public_id", publicId)
      .then(() => {});

    return ok(job);
  } catch (err) {
    console.error("[jobs/[publicId] GET] error:", err);
    return serverError();
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 공고를 수정할 수 있습니다");
    }

    const { publicId } = await params;
    const db = createAdminClient();

    // Verify ownership
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

    const body = await req.json();
    const {
      title,
      description,
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

    const updatePayload: Record<string, unknown> = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (payMin !== undefined) updatePayload.pay_min = payMin;
    if (payMax !== undefined) updatePayload.pay_max = payMax;
    if (payUnit !== undefined) updatePayload.pay_unit = payUnit;
    if (requiredCount !== undefined) updatePayload.required_count = requiredCount;
    if (alwaysOpen !== undefined) updatePayload.always_open = alwaysOpen;
    if (startDate !== undefined) updatePayload.start_date = startDate;
    if (endDate !== undefined) updatePayload.end_date = endDate;
    if (accommodationProvided !== undefined) updatePayload.accommodation_provided = accommodationProvided;
    if (mealProvided !== undefined) updatePayload.meal_provided = mealProvided;
    if (transportationProvided !== undefined) updatePayload.transportation_provided = transportationProvided;
    if (healthCheckRequired !== undefined) updatePayload.health_check_required = healthCheckRequired;

    if (Object.keys(updatePayload).length === 0) {
      return badRequest("수정할 필드가 없습니다");
    }

    const { data: updated, error } = await db
      .from("jobs")
      .update(updatePayload)
      .eq("public_id", publicId)
      .select("*, sites(*, companies(*))")
      .single();

    if (error || !updated) {
      console.error("[jobs/[publicId] PUT] update error:", error);
      return serverError("공고 수정에 실패했습니다");
    }

    return ok(updated);
  } catch (err) {
    console.error("[jobs/[publicId] PUT] error:", err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 공고를 삭제할 수 있습니다");
    }

    const { publicId } = await params;
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

    const { error } = await db
      .from("jobs")
      .update({ status: "ARCHIVED" })
      .eq("public_id", publicId);

    if (error) {
      console.error("[jobs/[publicId] DELETE] error:", error);
      return serverError("공고 삭제에 실패했습니다");
    }

    return noContent();
  } catch (err) {
    console.error("[jobs/[publicId] DELETE] error:", err);
    return serverError();
  }
}
