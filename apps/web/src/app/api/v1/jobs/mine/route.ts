import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, forbidden, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주만 접근할 수 있습니다");
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    // Get employer's company_id
    const { data: employerProfile } = await db
      .from("employer_profiles")
      .select("company_id")
      .eq("user_id", principal.userId)
      .single();

    if (!employerProfile?.company_id) {
      return paginated([], page, size, 0);
    }

    const { data, error, count } = await db
      .from("jobs")
      .select(
        `public_id, title, status, pay_min, pay_max, pay_unit, required_count,
         always_open, start_date, end_date, view_count, application_count,
         application_types, created_at,
         accommodation_provided, meal_provided, transportation_provided,
         job_bids(count),
         sites!inner(public_id, name, sido, sigungu, company_id,
           companies!inner(name)
         )`,
        { count: "exact" }
      )
      .eq("sites.company_id" as never, employerProfile.company_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[jobs/mine GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((job) => {
      const site = job.sites as { public_id: string; name: string; sido: string | null; sigungu: string | null; companies: { name: string } };
      const bidCount = Array.isArray((job as any).job_bids) ? (job as any).job_bids[0]?.count ?? 0 : 0;
      return {
        publicId: job.public_id,
        title: job.title,
        companyName: site?.companies?.name ?? "",
        sitePublicId: site?.public_id ?? "",
        siteName: site?.name ?? "",
        sido: site?.sido ?? undefined,
        sigungu: site?.sigungu ?? undefined,
        payMin: job.pay_min ?? undefined,
        payMax: job.pay_max ?? undefined,
        payUnit: job.pay_unit,
        requiredCount: job.required_count ?? 1,
        applicationTypes: Array.isArray(job.application_types) ? job.application_types : [],
        accommodationProvided: job.accommodation_provided ?? false,
        mealProvided: job.meal_provided ?? false,
        transportationProvided: job.transportation_provided ?? false,
        status: job.status,
        alwaysOpen: job.always_open ?? false,
        startDate: job.start_date ?? undefined,
        endDate: job.end_date ?? undefined,
        viewCount: job.view_count ?? 0,
        applicationCount: job.application_count ?? 0,
        bidCount,
        createdAt: job.created_at,
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[jobs/mine GET] error:", err);
    return serverError();
  }
}
