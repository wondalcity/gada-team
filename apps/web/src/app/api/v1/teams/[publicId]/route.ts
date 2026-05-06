import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

async function getTeamWithMembers(db: any, publicId: string) {
  const { data: team, error } = await db
    .from("teams")
    .select(
      `
      id,
      public_id,
      name,
      leader_id,
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
    .eq("public_id", publicId)
    .is("deleted_at", null)
    .single();

  if (error || !team) return null;

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

  return {
    team,
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
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const db = createAdminClient();

    const result = await getTeamWithMembers(db, publicId);
    if (!result) return notFound("팀을 찾을 수 없습니다");

    const { team, members } = result;

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
      members,
    });
  } catch (err) {
    console.error("[teams/[publicId] GET] error:", err);
    return serverError();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: team, error: fetchError } = await db
      .from("teams")
      .select("id, leader_id")
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !team) return notFound("팀을 찾을 수 없습니다");
    if (team.leader_id !== principal.userId) return forbidden("팀 리더만 수정할 수 있습니다");

    const body = await req.json();
    const {
      name,
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

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name;
    if (introShort !== undefined) updatePayload.intro_short = introShort;
    if (introLong !== undefined) updatePayload.intro_long = introLong;
    if (introMultilingual !== undefined) updatePayload.intro_multilingual = introMultilingual;
    if (isNationwide !== undefined) updatePayload.is_nationwide = isNationwide;
    if (regions !== undefined) updatePayload.regions = regions;
    if (equipment !== undefined) updatePayload.equipment = equipment;
    if (portfolio !== undefined) updatePayload.portfolio = portfolio;
    if (desiredPayMin !== undefined) updatePayload.desired_pay_min = desiredPayMin;
    if (desiredPayMax !== undefined) updatePayload.desired_pay_max = desiredPayMax;
    if (desiredPayUnit !== undefined) updatePayload.desired_pay_unit = desiredPayUnit;
    if (coverImageUrl !== undefined) updatePayload.cover_image_url = coverImageUrl;
    if (headcountTarget !== undefined) updatePayload.headcount_target = headcountTarget;

    if (Object.keys(updatePayload).length === 0) return badRequest("변경할 항목이 없습니다");

    const { error: updateError } = await db
      .from("teams")
      .update(updatePayload)
      .eq("id", team.id);

    if (updateError) {
      console.error("[teams/[publicId] PUT] error:", updateError);
      return serverError();
    }

    const updated = await getTeamWithMembers(db, publicId);
    if (!updated) return serverError();

    const { team: updatedTeam, members } = updated;

    return ok({
      publicId: updatedTeam.public_id,
      name: updatedTeam.name,
      teamType: updatedTeam.team_type,
      introShort: updatedTeam.intro_short,
      introLong: updatedTeam.intro_long,
      introMultilingual: updatedTeam.intro_multilingual,
      isNationwide: updatedTeam.is_nationwide,
      regions: updatedTeam.regions,
      equipment: updatedTeam.equipment,
      portfolio: updatedTeam.portfolio,
      desiredPayMin: updatedTeam.desired_pay_min,
      desiredPayMax: updatedTeam.desired_pay_max,
      desiredPayUnit: updatedTeam.desired_pay_unit,
      coverImageUrl: updatedTeam.cover_image_url,
      headcountTarget: updatedTeam.headcount_target,
      status: updatedTeam.status,
      createdAt: updatedTeam.created_at,
      members,
    });
  } catch (err) {
    console.error("[teams/[publicId] PUT] error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: team, error: fetchError } = await db
      .from("teams")
      .select("id, leader_id, status")
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !team) return notFound("팀을 찾을 수 없습니다");
    if (team.leader_id !== principal.userId) return forbidden("팀 리더만 해산할 수 있습니다");
    if (team.status === "DISSOLVED") return badRequest("이미 해산된 팀입니다");

    const { error: updateError } = await db
      .from("teams")
      .update({ status: "DISSOLVED", deleted_at: new Date().toISOString() })
      .eq("id", team.id);

    if (updateError) {
      console.error("[teams/[publicId] DELETE] error:", updateError);
      return serverError();
    }

    return noContent();
  } catch (err) {
    console.error("[teams/[publicId] DELETE] error:", err);
    return serverError();
  }
}
