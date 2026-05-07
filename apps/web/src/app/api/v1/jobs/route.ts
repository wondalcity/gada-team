import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { created, unauthorized, forbidden, badRequest, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";
    const sido = searchParams.get("sido") ?? "";
    const sigungu = searchParams.get("sigungu") ?? "";
    const payUnit = searchParams.get("payUnit") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("jobs")
      .select(
        `id, public_id, title, status, pay_min, pay_max, pay_unit, required_count,
         always_open, start_date, end_date, accommodation_provided, meal_provided,
         transportation_provided, health_check_required, view_count, application_count,
         application_types, published_at, created_at,
         sites!inner(public_id, name, address, sido, sigungu,
           companies!inner(public_id, name, logo_url, is_verified)
         )`,
        { count: "exact" }
      )
      .eq("status", "PUBLISHED")
      .is("deleted_at", null);

    if (keyword) query = query.ilike("title", `%${keyword}%`);
    if (sido) query = query.eq("sites.sido" as never, sido);
    if (sigungu) query = query.eq("sites.sigungu" as never, sigungu);
    if (payUnit) query = query.eq("pay_unit", payUnit);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[jobs GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((job) => {
      const site = job.sites as { public_id: string; name: string; address: string; sido: string | null; sigungu: string | null; companies: { public_id: string; name: string; logo_url: string | null; is_verified: boolean } };
      const company = site?.companies;
      return {
        publicId: job.public_id,
        sitePublicId: site?.public_id ?? "",
        companyPublicId: company?.public_id ?? "",
        companyName: company?.name ?? "",
        companyLogoUrl: company?.logo_url ?? undefined,
        siteName: site?.name ?? "",
        sido: site?.sido ?? undefined,
        sigungu: site?.sigungu ?? undefined,
        title: job.title,
        payMin: job.pay_min ?? undefined,
        payMax: job.pay_max ?? undefined,
        payUnit: job.pay_unit,
        applicationTypes: Array.isArray(job.application_types) ? job.application_types : [],
        accommodationProvided: job.accommodation_provided ?? false,
        mealProvided: job.meal_provided ?? false,
        transportationProvided: job.transportation_provided ?? false,
        requiredCount: job.required_count ?? undefined,
        alwaysOpen: job.always_open ?? false,
        startDate: job.start_date ?? undefined,
        endDate: job.end_date ?? undefined,
        status: job.status,
        viewCount: job.view_count ?? 0,
        applicationCount: job.application_count ?? 0,
        publishedAt: job.published_at ?? undefined,
        createdAt: job.created_at,
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[jobs GET] error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 공고를 생성할 수 있습니다");
    }

    const body = await req.json();
    const {
      siteId,
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

    if (!siteId || !title || !payUnit) {
      return badRequest("siteId, title, payUnit은 필수입니다");
    }

    const db = createAdminClient();

    // Look up employer's company_id via employer_profiles
    const { data: employerProfile } = await db
      .from("employer_profiles")
      .select("company_id")
      .eq("user_id", principal.userId)
      .single();

    if (!employerProfile?.company_id) {
      return forbidden("회사 정보가 없습니다");
    }

    // Verify site belongs to employer's company
    const { data: site } = await db
      .from("sites")
      .select("id")
      .eq("public_id", siteId)
      .eq("company_id", employerProfile.company_id)
      .single();

    if (!site) {
      return forbidden("해당 현장에 대한 권한이 없습니다");
    }

    const { data: job, error } = await db
      .from("jobs")
      .insert({
        site_id: site.id,
        title,
        description: description ?? null,
        status: "DRAFT",
        pay_min: payMin ?? null,
        pay_max: payMax ?? null,
        pay_unit: payUnit,
        required_count: requiredCount ?? 1,
        always_open: alwaysOpen ?? false,
        start_date: startDate ?? null,
        end_date: endDate ?? null,
        accommodation_provided: accommodationProvided ?? false,
        meal_provided: mealProvided ?? false,
        transportation_provided: transportationProvided ?? false,
        health_check_required: healthCheckRequired ?? false,
      })
      .select("*, sites(*, companies(*))")
      .single();

    if (error || !job) {
      console.error("[jobs POST] insert error:", error);
      return serverError("공고 생성에 실패했습니다");
    }

    return created(job);
  } catch (err) {
    console.error("[jobs POST] error:", err);
    return serverError();
  }
}
