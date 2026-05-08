import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, forbidden, serverError, paginated } from "@/lib/api-response";

// GET /api/v1/bids/mine  — worker or team_leader views their own bids
export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER" && principal.role !== "TEAM_LEADER") {
      return forbidden("근로자 또는 팀장만 접근할 수 있습니다");
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    // For TEAM_LEADER also fetch bids submitted as team
    let teamIds: number[] = [];
    if (principal.role === "TEAM_LEADER") {
      const { data: teams } = await db
        .from("teams")
        .select("id")
        .eq("leader_user_id", principal.userId);
      teamIds = (teams ?? []).map((t) => t.id);
    }

    let query = db
      .from("job_bids")
      .select(
        `public_id, bidder_type, bid_amount, message, status, selected_at, created_at,
         jobs!inner(public_id, title, pay_min, pay_max, pay_unit, status,
           sites!inner(name, sido, sigungu,
             companies!inner(name, logo_url)
           )
         )`,
        { count: "exact" }
      );

    if (teamIds.length > 0) {
      query = query.or(
        `bidder_user_id.eq.${principal.userId},bidder_team_id.in.(${teamIds.join(",")})`
      );
    } else {
      query = query.eq("bidder_user_id", principal.userId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[bids/mine GET] error:", error);
      return serverError();
    }

    const content = (data ?? []).map((b) => {
      const job = b.jobs as {
        public_id: string; title: string; pay_min: number | null; pay_max: number | null;
        pay_unit: string; status: string;
        sites: { name: string; sido: string | null; sigungu: string | null; companies: { name: string; logo_url: string | null } };
      };
      const site = job?.sites;
      const company = site?.companies;
      return {
        publicId: b.public_id,
        bidderType: b.bidder_type,
        bidAmount: b.bid_amount,
        message: b.message ?? undefined,
        status: b.status,
        selectedAt: b.selected_at ?? undefined,
        createdAt: b.created_at,
        job: {
          publicId: job.public_id,
          title: job.title,
          payMin: job.pay_min ?? undefined,
          payMax: job.pay_max ?? undefined,
          payUnit: job.pay_unit,
          jobStatus: job.status,
          siteName: site?.name ?? "",
          sido: site?.sido ?? undefined,
          sigungu: site?.sigungu ?? undefined,
          companyName: company?.name ?? "",
          companyLogoUrl: company?.logo_url ?? null,
        },
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[bids/mine GET] error:", err);
    return serverError();
  }
}
