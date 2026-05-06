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
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    // Verify caller is the team leader
    const { data: team, error: teamError } = await db
      .from("teams")
      .select("id, leader_id")
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .single();

    if (teamError || !team) return notFound("팀을 찾을 수 없습니다");
    if (team.leader_id !== principal.userId) return forbidden("팀 리더만 초대할 수 있습니다");

    const body = await req.json();
    const { workerProfilePublicId } = body;
    if (!workerProfilePublicId) return badRequest("workerProfilePublicId는 필수입니다");

    // Find worker_profile by public_id
    const { data: workerProfile, error: profileError } = await db
      .from("worker_profiles")
      .select("id, user_id, full_name, profile_image_url, public_id")
      .eq("public_id", workerProfilePublicId)
      .single();

    if (profileError || !workerProfile) return notFound("근로자 프로필을 찾을 수 없습니다");

    const targetUserId = workerProfile.user_id;

    // Fetch user info
    const { data: targetUser } = await db
      .from("users")
      .select("id, public_id, phone")
      .eq("id", targetUserId)
      .is("deleted_at", null)
      .single();

    if (!targetUser) return notFound("사용자를 찾을 수 없습니다");

    // Check if already a member
    const { data: existing } = await db
      .from("team_members")
      .select("id, invitation_status")
      .eq("team_id", team.id)
      .eq("user_id", targetUserId)
      .single();

    if (existing && existing.invitation_status === "ACCEPTED") {
      return badRequest("이미 팀 멤버입니다");
    }
    if (existing && existing.invitation_status === "PENDING") {
      return badRequest("이미 초대 중인 멤버입니다");
    }

    if (existing) {
      await db
        .from("team_members")
        .update({ invitation_status: "PENDING" })
        .eq("id", existing.id);
    } else {
      await db.from("team_members").insert({
        team_id: team.id,
        user_id: targetUserId,
        role: "MEMBER",
        invitation_status: "PENDING",
      });
    }

    return ok({
      type: "INVITED" as const,
      member: {
        userId: targetUser.id,
        userPublicId: targetUser.public_id,
        phone: targetUser.phone,
        fullName: workerProfile.full_name ?? null,
        profileImageUrl: workerProfile.profile_image_url ?? null,
        workerProfilePublicId: workerProfile.public_id,
      },
    });
  } catch (err) {
    console.error("[teams/[publicId]/invitations/by-profile POST] error:", err);
    return serverError();
  }
}
