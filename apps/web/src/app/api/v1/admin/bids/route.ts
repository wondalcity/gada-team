import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, forbidden, serverError, paginated } from "@/lib/api-response";

// GET /api/v1/admin/bids  — admin views all bids
export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "ADMIN") return forbidden("관리자만 접근할 수 있습니다");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const jobPublicId = searchParams.get("jobPublicId");
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    let query = db
      .from("job_bids")
      .select(
        `public_id, bidder_type, bid_amount, message, status, selected_at, created_at,
         jobs!inner(public_id, title,
           sites!inner(name, companies!inner(name))
         ),
         worker:users!bidder_user_id(public_id, worker_profiles(full_name)),
         team:teams!bidder_team_id(public_id, name)`,
        { count: "exact" }
      );

    if (status) query = query.eq("status", status);
    if (jobPublicId) query = query.eq("jobs.public_id" as never, jobPublicId);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[admin/bids GET] error:", error);
      return serverError();
    }

    const content = (data ?? []).map((b) => {
      const job = b.jobs as unknown as { public_id: string; title: string; sites: { name: string; companies: { name: string } } };
      const worker = b.worker as unknown as { public_id: string; worker_profiles: { full_name: string }[] } | null;
      const team = b.team as unknown as { public_id: string; name: string } | null;
      return {
        publicId: b.public_id,
        bidderType: b.bidder_type,
        bidAmount: b.bid_amount,
        message: b.message ?? undefined,
        status: b.status,
        selectedAt: b.selected_at ?? undefined,
        createdAt: b.created_at,
        jobPublicId: job.public_id,
        jobTitle: job.title,
        siteName: job.sites?.name ?? "",
        companyName: (job.sites as unknown as { companies: { name: string } })?.companies?.name ?? "",
        workerName: worker?.worker_profiles?.[0]?.full_name ?? undefined,
        teamName: team?.name ?? undefined,
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[admin/bids GET] error:", err);
    return serverError();
  }
}
