import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/api-response";

// POST /api/v1/jobs/[publicId]/bids/[bidPublicId]/select
// Employer selects a winning bid — notifies all bidders
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; bidPublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 입찰을 선정할 수 있습니다");

    const { publicId: jobPublicId, bidPublicId } = await params;

    // Demo bid IDs — skip DB for dummy data
    if (bidPublicId.startsWith("demo-bid-")) {
      return ok({ message: "입찰이 선정되었습니다 (데모)", bidPublicId });
    }

    const db = createAdminClient();

    // Load job + verify employer ownership
    const { data: job } = await db
      .from("jobs")
      .select("id, title, sites!inner(company_id)")
      .eq("public_id", jobPublicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");

    const site = job.sites as { company_id: number };
    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .eq("company_id", site.company_id)
      .maybeSingle();

    if (!profile) return forbidden("이 공고에 대한 권한이 없습니다");

    // Load target bid
    const { data: selectedBid } = await db
      .from("job_bids")
      .select("id, public_id, bidder_type, bidder_user_id, bidder_team_id, status")
      .eq("public_id", bidPublicId)
      .eq("job_id", job.id)
      .single();

    if (!selectedBid) return notFound("입찰을 찾을 수 없습니다");
    if (selectedBid.status === "SELECTED") return badRequest("이미 선정된 입찰입니다");

    // Check if another bid was already selected
    const { data: alreadySelected } = await db
      .from("job_bids")
      .select("id")
      .eq("job_id", job.id)
      .eq("status", "SELECTED")
      .maybeSingle();

    if (alreadySelected) return badRequest("이미 선정된 입찰이 있습니다. 먼저 선정을 취소해주세요");

    const now = new Date().toISOString();

    // Mark selected bid as SELECTED
    await db
      .from("job_bids")
      .update({ status: "SELECTED", selected_at: now, updated_at: now })
      .eq("id", selectedBid.id);

    // Mark all other PENDING bids as REJECTED
    const { data: rejectedBids } = await db
      .from("job_bids")
      .update({ status: "REJECTED", updated_at: now })
      .eq("job_id", job.id)
      .eq("status", "PENDING")
      .neq("id", selectedBid.id)
      .select("bidder_type, bidder_user_id, bidder_team_id");

    // ── Send notifications ────────────────────────────────────────────────────

    const selectedUserId = await resolveBidderUserId(
      db,
      selectedBid.bidder_type,
      selectedBid.bidder_user_id,
      selectedBid.bidder_team_id
    );
    if (selectedUserId) {
      await db.from("notifications").insert({
        user_id: selectedUserId,
        type: "BID",
        title: "입찰 선정 알림",
        body: `"${job.title}" 공고에서 귀하의 입찰이 최종 선정되었습니다. 축하드립니다!`,
        data: { jobPublicId, bidPublicId },
      });
    }

    if (rejectedBids && rejectedBids.length > 0) {
      const notifInserts = await Promise.all(
        rejectedBids.map(async (b) => {
          const uid = await resolveBidderUserId(
            db,
            b.bidder_type,
            b.bidder_user_id,
            b.bidder_team_id
          );
          return uid
            ? {
                user_id: uid,
                type: "BID" as const,
                title: "입찰 미선정 알림",
                body: `"${job.title}" 공고 입찰에서 미선정되었습니다. 다음 기회를 노려보세요.`,
                data: { jobPublicId },
              }
            : null;
        })
      );
      const valid = notifInserts.filter(Boolean);
      if (valid.length > 0) await db.from("notifications").insert(valid);
    }

    return ok({ message: "입찰이 선정되었습니다", bidPublicId });
  } catch (err) {
    console.error("[bids/select POST] error:", err);
    return serverError();
  }
}

async function resolveBidderUserId(
  db: ReturnType<typeof createAdminClient>,
  bidderType: string,
  bidderUserId: number | null,
  bidderTeamId: number | null
): Promise<number | null> {
  if (bidderType === "WORKER") return bidderUserId;
  if (bidderType === "TEAM" && bidderTeamId) {
    const { data } = await db
      .from("teams")
      .select("leader_user_id")
      .eq("id", bidderTeamId)
      .single();
    return (data as { leader_user_id: number } | null)?.leader_user_id ?? null;
  }
  return null;
}
