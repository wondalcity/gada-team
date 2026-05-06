import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  created,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
  paginated,
} from "@/lib/api-response";

const POINTS_PER_PROPOSAL = 1;

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    const { data, error, count } = await db
      .from("team_proposals")
      .select(
        `id, public_id, message, points_used, status, responded_at, created_at,
         teams!inner(id, public_id, name),
         jobs!inner(id, public_id, title)`,
        { count: "exact" }
      )
      .eq("employer_user_id", principal.userId)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[proposals GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[proposals GET] error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 제안할 수 있습니다");

    const body = await req.json();
    const { teamPublicId, jobPublicId, message } = body;

    if (!teamPublicId) return badRequest("teamPublicId는 필수입니다");
    if (!jobPublicId) return badRequest("jobPublicId는 필수입니다");

    const db = createAdminClient();

    // Find team
    const { data: team } = await db
      .from("teams")
      .select("id")
      .eq("public_id", teamPublicId)
      .single();

    if (!team) return notFound("팀을 찾을 수 없습니다");

    // Find job
    const { data: job } = await db
      .from("jobs")
      .select("id")
      .eq("public_id", jobPublicId)
      .single();

    if (!job) return notFound("공고를 찾을 수 없습니다");

    // Get employer profile and point account
    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .maybeSingle();

    if (!profile) return forbidden("고용주 프로필이 없습니다");

    const { data: account } = await db
      .from("employer_point_accounts")
      .select("id, balance")
      .eq("employer_profile_id", profile.id)
      .maybeSingle();

    if (!account || account.balance < POINTS_PER_PROPOSAL) {
      return badRequest("포인트가 부족합니다. 충전 후 이용해주세요");
    }

    // Deduct points
    const { error: deductErr } = await db
      .from("employer_point_accounts")
      .update({
        balance: account.balance - POINTS_PER_PROPOSAL,
        total_used: account.balance - POINTS_PER_PROPOSAL,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (deductErr) {
      console.error("[proposals POST] deduct error:", deductErr);
      return serverError();
    }

    // Create proposal
    const { data: proposal, error: proposalErr } = await db
      .from("team_proposals")
      .insert({
        employer_user_id: principal.userId,
        team_id: team.id,
        job_id: job.id,
        message: message ?? null,
        points_used: POINTS_PER_PROPOSAL,
        status: "PENDING",
      })
      .select()
      .single();

    if (proposalErr || !proposal) {
      console.error("[proposals POST] insert error:", proposalErr);
      // Attempt to refund points on failure
      await db
        .from("employer_point_accounts")
        .update({ balance: account.balance, updated_at: new Date().toISOString() })
        .eq("id", account.id);
      return serverError();
    }

    return created(proposal);
  } catch (err) {
    console.error("[proposals POST] error:", err);
    return serverError();
  }
}
