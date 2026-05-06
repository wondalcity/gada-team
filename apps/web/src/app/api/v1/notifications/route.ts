import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, serverError, paginated, ok } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    const { data, error, count } = await db
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", principal.userId)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[notifications GET] query error:", error);
      return serverError();
    }

    // Get unread count
    const { count: unreadCount } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", principal.userId)
      .eq("is_read", false);

    const totalPages = Math.ceil((count ?? 0) / size);
    return ok({
      content: data ?? [],
      page,
      size,
      totalElements: count ?? 0,
      totalPages,
      isFirst: page === 0,
      isLast: page >= totalPages - 1,
      unreadCount: unreadCount ?? 0,
    });
  } catch (err) {
    console.error("[notifications GET] error:", err);
    return serverError();
  }
}
