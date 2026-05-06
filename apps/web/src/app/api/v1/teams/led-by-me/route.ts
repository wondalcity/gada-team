import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const db = createAdminClient();

    const { data: teams, error } = await db
      .from("teams")
      .select(
        `
        id,
        public_id,
        name,
        team_type,
        intro_short,
        intro_long,
        intro_multilingual,
        is_nationwide,
        regions,
        equipment,
        portfolio,
        desired_pay_min,
        desired_pay_max,
        desired_pay_unit,
        cover_image_url,
        headcount_target,
        status,
        created_at
      `
      )
      .eq("leader_id", principal.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[teams/led-by-me GET] error:", error);
      return serverError();
    }

    const teamIds = (teams ?? []).map((t: any) => t.id);

    // Fetch members for all teams in one query
    let membersByTeam: Record<number, any[]> = {};
    if (teamIds.length > 0) {
      const { data: allMembers } = await db
        .from("team_members")
        .select(
          `
          id,
          team_id,
          role,
          invitation_status,
          joined_at,
          users(id, public_id, phone),
          worker_profiles(full_name, profile_image_url)
        `
        )
        .in("team_id", teamIds)
        .eq("invitation_status", "ACCEPTED");

      for (const m of allMembers ?? []) {
        const tid = (m as any).team_id;
        if (!membersByTeam[tid]) membersByTeam[tid] = [];
        membersByTeam[tid].push(m);
      }
    }

    const result = (teams ?? []).map((team: any) => ({
      publicId: team.public_id,
      name: team.name,
      teamType: team.team_type,
      introShort: team.intro_short,
      introLong: team.intro_long,
      introMultilingual: team.intro_multilingual,
      isNationwide: team.is_nationwide,
      regions: team.regions,
      equipment: team.equipment,
      portfolio: team.portfolio,
      desiredPayMin: team.desired_pay_min,
      desiredPayMax: team.desired_pay_max,
      desiredPayUnit: team.desired_pay_unit,
      coverImageUrl: team.cover_image_url,
      headcountTarget: team.headcount_target,
      status: team.status,
      createdAt: team.created_at,
      members: (membersByTeam[team.id] ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        invitationStatus: m.invitation_status,
        joinedAt: m.joined_at,
        userId: m.users?.id ?? null,
        userPublicId: m.users?.public_id ?? null,
        phone: m.users?.phone ?? null,
        fullName: m.worker_profiles?.full_name ?? null,
        profileImageUrl: m.worker_profiles?.profile_image_url ?? null,
      })),
    }));

    return ok(result);
  } catch (err) {
    console.error("[teams/led-by-me GET] error:", err);
    return serverError();
  }
}
