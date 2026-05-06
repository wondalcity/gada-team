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

    const { data: invitations, error } = await db
      .from("team_members")
      .select(
        `
        id,
        role,
        invitation_status,
        joined_at,
        teams(
          public_id,
          name,
          team_type,
          intro_short,
          cover_image_url,
          status,
          leader_id
        )
      `
      )
      .eq("user_id", principal.userId)
      .eq("invitation_status", "PENDING")
      .order("id", { ascending: false });

    if (error) {
      console.error("[invitations/mine GET] error:", error);
      return serverError();
    }

    // Fetch leader info for each invitation
    const leaderIds = [...new Set((invitations ?? []).map((i: any) => i.teams?.leader_id).filter(Boolean))];
    let leaderMap: Record<number, any> = {};
    if (leaderIds.length > 0) {
      const { data: leaders } = await db
        .from("worker_profiles")
        .select("user_id, full_name, profile_image_url")
        .in("user_id", leaderIds);
      for (const l of leaders ?? []) {
        leaderMap[(l as any).user_id] = l;
      }
    }

    return ok(
      (invitations ?? []).map((inv: any) => ({
        id: inv.id,
        invitationStatus: inv.invitation_status,
        team: {
          publicId: inv.teams?.public_id ?? null,
          name: inv.teams?.name ?? null,
          teamType: inv.teams?.team_type ?? null,
          introShort: inv.teams?.intro_short ?? null,
          coverImageUrl: inv.teams?.cover_image_url ?? null,
          status: inv.teams?.status ?? null,
          leader: inv.teams?.leader_id
            ? {
                fullName: leaderMap[inv.teams.leader_id]?.full_name ?? null,
                profileImageUrl: leaderMap[inv.teams.leader_id]?.profile_image_url ?? null,
              }
            : null,
        },
      }))
    );
  } catch (err) {
    console.error("[invitations/mine GET] error:", err);
    return serverError();
  }
}
