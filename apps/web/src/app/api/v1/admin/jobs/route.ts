import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { unauthorized, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("jobs")
      .select(
        `id, public_id, title, status, pay_min, pay_max, pay_unit, required_count,
         always_open, start_date, end_date, view_count, application_count, created_at,
         accommodation_provided, meal_provided, transportation_provided, application_types,
         job_bids(count),
         sites!inner(id, public_id, name, address, sido, sigungu,
           companies!inner(id, public_id, name, status, is_verified)
         )`,
        { count: "exact" }
      );

    if (keyword) {
      query = query.ilike("title", `%${keyword}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[admin/jobs GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((job) => {
      const site = job.sites as { id: number; public_id: string; name: string; address: string; sido: string | null; sigungu: string | null; companies: { id: number; public_id: string; name: string; status: string; is_verified: boolean } };
      const company = site?.companies;
      const bidCount = Array.isArray((job as any).job_bids) ? (job as any).job_bids[0]?.count ?? 0 : 0;
      return {
        publicId: job.public_id,
        title: job.title,
        status: job.status,
        companyName: company?.name ?? "",
        companyPublicId: company?.public_id ?? "",
        siteName: site?.name ?? "",
        sitePublicId: site?.public_id ?? "",
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
        applicationCount: job.application_count ?? 0,
        viewCount: job.view_count ?? 0,
        bidCount,
        createdAt: job.created_at,
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[admin/jobs GET] error:", err);
    return serverError();
  }
}
