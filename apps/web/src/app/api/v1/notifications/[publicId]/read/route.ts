import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, notFound, forbidden, serverError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();

    const { publicId } = await params;
    const db = createAdminClient();

    const { data: notification, error: findErr } = await db
      .from("notifications")
      .select("id, user_id, is_read")
      .eq("public_id", publicId)
      .single();

    if (findErr || !notification) return notFound("알림을 찾을 수 없습니다");
    if (notification.user_id !== principal.userId) return forbidden("이 알림에 접근할 권한이 없습니다");

    const { data: updated, error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[notification read PATCH] update error:", error);
      return serverError();
    }

    return ok(updated);
  } catch (err) {
    console.error("[notification read PATCH] error:", err);
    return serverError();
  }
}
