import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  created,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  paginated,
} from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";
    const sido = searchParams.get("sido") ?? "";
    const teamType = searchParams.get("teamType") ?? "";
    const isNationwide = searchParams.get("isNationwide");
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();
    const from = page * size;
    const to = from + size - 1;

    let query = db
      .from("teams")
      .select(
        `
        id,
        public_id,
        name,
        team_type,
        intro_short,
        is_nationwide,
        regions,
        desired_pay_min,
        desired_pay_max,
        desired_pay_unit,
        cover_image_url,
        headcount_target,
        status,
        created_at
      `,
        { count: "exact" }
      )
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (keyword) {
      query = query.ilike("name", `%${keyword}%`);
    }
    if (teamType) {
      query = query.eq("team_type", teamType);
    }
    if (isNationwide !== null && isNationwide !== "") {
      query = query.eq("is_nationwide", isNationwide === "true");
    }
    if (sido) {
      query = query.contains("regions", [{ sido }]);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[teams GET] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((row: any) => ({
      publicId: row.public_id,
      name: row.name,
      teamType: row.team_type,
      introShort: row.intro_short,
      isNationwide: row.is_nationwide,
      regions: row.regions,
      desiredPayMin: row.desired_pay_min,
      desiredPayMax: row.desired_pay_max,
      desiredPayUnit: row.desired_pay_unit,
      coverImageUrl: row.cover_image_url,
      headcountTarget: row.headcount_target,
      createdAt: row.created_at,
    }));

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[teams GET] error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 팀을 생성할 수 있습니다");

    const body = await req.json();
    const {
      name,
      teamType,
      introShort,
      introLong,
      introMultilingual,
      isNationwide,
      regions,
      equipment,
      portfolio,
      desiredPayMin,
      desiredPayMax,
      desiredPayUnit,
      coverImageUrl,
      headcountTarget,
    } = body;

    if (!name) return badRequest("팀 이름은 필수입니다");
    if (!teamType || !["SQUAD", "COMPANY_LINKED"].includes(teamType)) {
      return badRequest("teamType은 SQUAD 또는 COMPANY_LINKED이어야 합니다");
    }

    const db = createAdminClient();

    const { data: team, error: teamError } = await db
      .from("teams")
      .insert({
        name,
        leader_id: principal.userId,
        team_type: teamType,
        intro_short: introShort ?? null,
        intro_long: introLong ?? null,
        intro_multilingual: introMultilingual ?? null,
        is_nationwide: isNationwide ?? false,
        regions: regions ?? null,
        equipment: equipment ?? null,
        portfolio: portfolio ?? null,
        desired_pay_min: desiredPayMin ?? null,
        desired_pay_max: desiredPayMax ?? null,
        desired_pay_unit: desiredPayUnit ?? null,
        cover_image_url: coverImageUrl ?? null,
        headcount_target: headcountTarget ?? null,
        status: "ACTIVE",
      })
      .select("id, public_id, name, team_type, status, created_at")
      .single();

    if (teamError || !team) {
      console.error("[teams POST] team insert error:", teamError);
      return serverError("팀 생성에 실패했습니다");
    }

    // Add creator as LEADER in team_members
    const { error: memberError } = await db.from("team_members").insert({
      team_id: team.id,
      user_id: principal.userId,
      role: "LEADER",
      invitation_status: "ACCEPTED",
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error("[teams POST] team_members insert error:", memberError);
      return serverError("팀 멤버 추가에 실패했습니다");
    }

    // Update worker_profile.is_team_leader = true
    await db
      .from("worker_profiles")
      .update({ is_team_leader: true })
      .eq("user_id", principal.userId);

    return created({
      publicId: team.public_id,
      name: team.name,
      teamType: team.team_type,
      status: team.status,
      createdAt: team.created_at,
    });
  } catch (err) {
    console.error("[teams POST] error:", err);
    return serverError();
  }
}
