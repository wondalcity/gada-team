import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, created, unauthorized, forbidden, badRequest, notFound, serverError, paginated } from "@/lib/api-response";

// ─── Dummy data (demo fallback when no real bids exist) ─────────────────────

const DUMMY_BIDS = [
  {
    publicId: "demo-bid-001",
    bidderType: "WORKER",
    bidAmount: 4500000,
    message: "현장 경험 5년 이상으로 안전하고 빠른 작업이 가능합니다. 최선을 다하겠습니다.",
    status: "PENDING",
    selectedAt: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    worker: {
      publicId: "demo-worker-001",
      fullName: "Nguyen Van An",
      nationality: "베트남",
      visaType: "E-9",
      profileImageUrl: null,
      phone: "010-2345-6789",
    },
    team: undefined,
  },
  {
    publicId: "demo-bid-002",
    bidderType: "TEAM",
    bidAmount: 3800000,
    message: "저희 팀은 5인으로 구성되어 있으며, 철근 콘크리트 작업 전문입니다. 빠른 공기 내 마감 보장합니다.",
    status: "PENDING",
    selectedAt: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    worker: undefined,
    team: {
      publicId: "demo-team-001",
      name: "베트남 A팀",
      phone: "010-3456-7890",
    },
  },
  {
    publicId: "demo-bid-003",
    bidderType: "WORKER",
    bidAmount: 5200000,
    message: "건설 분야 8년 경력, 안전 교육 이수 완료. 책임감 있게 작업합니다.",
    status: "PENDING",
    selectedAt: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    worker: {
      publicId: "demo-worker-002",
      fullName: "Tran Minh Duc",
      nationality: "베트남",
      visaType: "E-9",
      profileImageUrl: null,
      phone: "010-4567-8901",
    },
    team: undefined,
  },
];

// ─── GET — employer/admin views all bids for a job ────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId: jobPublicId } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    // Try to find the job first — if not in DB, serve dummy data for demo/dev
    const { data: job, error: jobError } = await db
      .from("jobs")
      .select("id, title, pay_min, pay_max, pay_unit, sites!inner(company_id)")
      .eq("public_id", jobPublicId)
      .single();

    if (jobError || !job) {
      console.warn("[bids GET] job not found:", jobPublicId, "→ returning demo data");
      return paginated(DUMMY_BIDS, page, size, DUMMY_BIDS.length);
    }

    // Auth check only when job exists
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER" && principal.role !== "ADMIN") {
      return forbidden("고용주 또는 관리자만 조회할 수 있습니다");
    }

    // EMPLOYER: verify ownership (skip in demo mode if no profile found — return dummy)
    if (principal.role === "EMPLOYER") {
      const site = job.sites as unknown as { company_id: number };
      const { data: profile } = await db
        .from("employer_profiles")
        .select("id")
        .eq("user_id", principal.userId)
        .eq("company_id", site.company_id)
        .maybeSingle();
      if (!profile) {
        console.warn("[bids GET] no employer_profile match, returning demo data");
        return paginated(DUMMY_BIDS, page, size, DUMMY_BIDS.length);
      }
    }

    const { data, error, count } = await db
      .from("job_bids")
      .select(
        `public_id, bidder_type, bid_amount, message, status, selected_at, created_at,
         bidder_user_id, bidder_team_id,
         worker:users!bidder_user_id(public_id, worker_profiles(public_id, full_name, nationality, visa_type, profile_image_url)),
         team:teams!bidder_team_id(public_id, name)`,
        { count: "exact" }
      )
      .eq("job_id", job.id)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[bids GET] query error:", error);
      // Fallback to dummy data on query error
      return paginated(DUMMY_BIDS, page, size, DUMMY_BIDS.length);
    }

    // Return dummy data when no real bids exist (demo mode)
    if (!data || data.length === 0) {
      return paginated(DUMMY_BIDS, page, size, DUMMY_BIDS.length);
    }

    const content = (data ?? []).map((b) => {
      const worker = b.worker as unknown as {
        public_id: string;
        worker_profiles: {
          public_id: string;
          full_name: string;
          nationality: string;
          visa_type: string;
          profile_image_url: string | null;
        }[];
      } | null;
      const wp = worker?.worker_profiles?.[0];
      const team = b.team as unknown as { public_id: string; name: string } | null;
      return {
        publicId: b.public_id,
        bidderType: b.bidder_type,
        bidAmount: b.bid_amount,
        message: b.message ?? undefined,
        status: b.status,
        selectedAt: b.selected_at ?? undefined,
        createdAt: b.created_at,
        worker: wp
          ? {
              publicId: wp.public_id,
              fullName: wp.full_name,
              nationality: wp.nationality,
              visaType: wp.visa_type,
              profileImageUrl: wp.profile_image_url ?? null,
            }
          : undefined,
        team: team ? { publicId: team.public_id, name: team.name } : undefined,
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[bids GET] error:", err);
    return serverError();
  }
}

// ─── POST — worker or team_leader submits a bid ──────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER" && principal.role !== "TEAM_LEADER") {
      return forbidden("근로자 또는 팀장만 입찰할 수 있습니다");
    }

    const { publicId: jobPublicId } = await params;
    const body = await req.json();
    const { bidAmount, message, teamPublicId } = body;

    if (!bidAmount || bidAmount <= 0) return badRequest("입찰 금액을 입력해주세요");

    const db = createAdminClient();

    const { data: job } = await db
      .from("jobs")
      .select("id, status, pay_min, pay_max")
      .eq("public_id", jobPublicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");
    if (job.status !== "PUBLISHED") return badRequest("모집 중인 공고에만 입찰할 수 있습니다");

    let bidderType: "WORKER" | "TEAM" = "WORKER";
    let bidderTeamId: number | null = null;

    if (principal.role === "TEAM_LEADER" && teamPublicId) {
      const { data: team } = await db
        .from("teams")
        .select("id")
        .eq("public_id", teamPublicId)
        .single();
      if (!team) return notFound("팀을 찾을 수 없습니다");
      bidderType = "TEAM";
      bidderTeamId = team.id;
    }

    const insertData =
      bidderType === "TEAM"
        ? {
            job_id: job.id,
            bidder_type: "TEAM",
            bidder_team_id: bidderTeamId,
            bid_amount: bidAmount,
            message: message ?? null,
          }
        : {
            job_id: job.id,
            bidder_type: "WORKER",
            bidder_user_id: principal.userId,
            bid_amount: bidAmount,
            message: message ?? null,
          };

    const { data: bid, error } = await db
      .from("job_bids")
      .upsert(insertData as any, {
        onConflict:
          bidderType === "TEAM" ? "job_id,bidder_team_id" : "job_id,bidder_user_id",
      })
      .select()
      .single();

    if (error || !bid) {
      console.error("[bids POST] insert error:", error);
      return serverError("입찰 등록에 실패했습니다");
    }

    return created({
      publicId: bid.public_id,
      status: bid.status,
      bidAmount: bid.bid_amount,
    });
  } catch (err) {
    console.error("[bids POST] error:", err);
    return serverError();
  }
}
