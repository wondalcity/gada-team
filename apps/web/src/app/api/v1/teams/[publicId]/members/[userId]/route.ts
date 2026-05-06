import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  noContent,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; userId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();

    const { publicId, userId } = await params;
    const targetUserId = parseInt(userId, 10);
    if (isNaN(targetUserId)) return badRequest("유효하지 않은 userId입니다");

    const db = createAdminClient();

    // Fetch team
    const { data: team, error: teamError } = await db
      .from("teams")
      .select("id, leader_id")
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .single();

    if (teamError || !team) return notFound("팀을 찾을 수 없습니다");

    const isLeader = team.leader_id === principal.userId;
    const isSelf = targetUserId === principal.userId;

    if (!isLeader && !isSelf) {
      return forbidden("팀 리더 또는 본인만 멤버를 삭제할 수 있습니다");
    }

    // Cannot remove the leader themselves (use disband instead)
    if (isLeader && targetUserId === principal.userId && isLeader) {
      return badRequest("리더는 본인을 팀에서 제거할 수 없습니다. 팀 해산을 이용하세요.");
    }

    // Find the member record
    const { data: member, error: memberError } = await db
      .from("team_members")
      .select("id")
      .eq("team_id", team.id)
      .eq("user_id", targetUserId)
      .single();

    if (memberError || !member) return notFound("팀 멤버를 찾을 수 없습니다");

    const { error: deleteError } = await db
      .from("team_members")
      .delete()
      .eq("id", member.id);

    if (deleteError) {
      console.error("[teams/[publicId]/members/[userId] DELETE] error:", deleteError);
      return serverError();
    }

    return noContent();
  } catch (err) {
    console.error("[teams/[publicId]/members/[userId] DELETE] error:", err);
    return serverError();
  }
}
