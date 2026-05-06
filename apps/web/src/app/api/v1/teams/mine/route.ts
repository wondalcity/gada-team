import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const db = createAdminClient();

    // Find team where user is an ACCEPTED member
    const { data: memberRow, error: memberError } = await db
      .from("team_members")
      .select(
        `
        role,
        joined_at,
        teams(
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
        )
      `
      )
      .eq("user_id", principal.userId)
      .eq("invitation_status", "ACCEPTED")
      .is("teams.deleted_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .single();

    if (memberError || !memberRow || !memberRow.teams) {
      return notFound("소속된 팀이 없습니다");
    }

    const team = memberRow.teams as any;

    // Fetch members for this team
    const { data: members } = await db
      .from("team_members")
      .select(
        `
        id,
        role,
        invitation_status,
        joined_at,
        users(id, public_id, phone),
        worker_profiles(full_name, profile_image_url)
      `
      )
      .eq("team_id", team.id)
      .eq("invitation_status", "ACCEPTED");

    return ok({
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
      myRole: memberRow.role,
      members: (members ?? []).map((m: any) => ({
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
    });
  } catch (err) {
    console.error("[teams/mine GET] error:", err);
    return serverError();
  }
}
