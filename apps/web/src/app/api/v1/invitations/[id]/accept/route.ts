import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { id } = await params;
    const invitationId = parseInt(id, 10);
    if (isNaN(invitationId)) return badRequest("유효하지 않은 초대 ID입니다");

    const db = createAdminClient();

    const { data: invitation, error: fetchError } = await db
      .from("team_members")
      .select("id, user_id, team_id, invitation_status")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) return notFound("초대를 찾을 수 없습니다");
    if (invitation.user_id !== principal.userId) return forbidden("본인의 초대만 수락할 수 있습니다");
    if (invitation.invitation_status !== "PENDING") {
      return badRequest("대기 중인 초대만 수락할 수 있습니다");
    }

    const { error: updateError } = await db
      .from("team_members")
      .update({
        invitation_status: "ACCEPTED",
        joined_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("[invitations/[id]/accept POST] error:", updateError);
      return serverError();
    }

    // Fetch team info for response
    const { data: team } = await db
      .from("teams")
      .select("public_id, name, team_type")
      .eq("id", invitation.team_id)
      .single();

    return ok({
      invitationId,
      invitationStatus: "ACCEPTED",
      team: {
        publicId: team?.public_id ?? null,
        name: team?.name ?? null,
        teamType: team?.team_type ?? null,
      },
    });
  } catch (err) {
    console.error("[invitations/[id]/accept POST] error:", err);
    return serverError();
  }
}
