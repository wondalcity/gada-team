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

    // Find teams led by this user
    const { data: ledTeams, error: teamsError } = await db
      .from("teams")
      .select("id, public_id, name")
      .eq("leader_id", principal.userId)
      .is("deleted_at", null);

    if (teamsError) {
      console.error("[invitations/sent GET] teams error:", teamsError);
      return serverError();
    }

    const teamIds = (ledTeams ?? []).map((t: any) => t.id);
    if (teamIds.length === 0) return ok([]);

    const teamMap: Record<number, any> = {};
    for (const t of ledTeams ?? []) {
      teamMap[(t as any).id] = t;
    }

    const { data: invitations, error: invError } = await db
      .from("team_members")
      .select(
        `
        id,
        team_id,
        user_id,
        role,
        invitation_status,
        joined_at,
        users(id, public_id, phone),
        worker_profiles(full_name, profile_image_url)
      `
      )
      .in("team_id", teamIds)
      .in("invitation_status", ["PENDING", "ACCEPTED", "REJECTED"])
      .neq("user_id", principal.userId)
      .order("id", { ascending: false });

    if (invError) {
      console.error("[invitations/sent GET] invitations error:", invError);
      return serverError();
    }

    return ok(
      (invitations ?? []).map((inv: any) => ({
        id: inv.id,
        teamPublicId: teamMap[inv.team_id]?.public_id ?? null,
        teamName: teamMap[inv.team_id]?.name ?? null,
        invitationStatus: inv.invitation_status,
        role: inv.role,
        joinedAt: inv.joined_at,
        invitee: {
          userId: inv.users?.id ?? null,
          userPublicId: inv.users?.public_id ?? null,
          phone: inv.users?.phone ?? null,
          fullName: inv.worker_profiles?.full_name ?? null,
          profileImageUrl: inv.worker_profiles?.profile_image_url ?? null,
        },
      }))
    );
  } catch (err) {
    console.error("[invitations/sent GET] error:", err);
    return serverError();
  }
}
