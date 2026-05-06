import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { unauthorized, forbidden, serverError, paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const db = createAdminClient();

    const from = page * size;
    const to = from + size - 1;

    const { data, error, count } = await db
      .from("applications")
      .select(
        `
        public_id,
        application_type,
        status,
        is_scouted,
        is_verified,
        created_at,
        application_status_history(to_status, created_at),
        jobs(
          public_id,
          title,
          sites(
            companies(name)
          )
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", principal.userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[applications/mine] query error:", error);
      return serverError();
    }

    const content = (data ?? []).map((row: any) => {
      const lastHistory = (row.application_status_history ?? []).sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        publicId: row.public_id,
        jobTitle: row.jobs?.title ?? null,
        jobPublicId: row.jobs?.public_id ?? null,
        companyName: row.jobs?.sites?.companies?.name ?? null,
        applicationType: row.application_type,
        status: row.status,
        statusUpdatedAt: lastHistory?.created_at ?? row.created_at,
        isScouted: row.is_scouted,
        isVerified: row.is_verified,
        appliedAt: row.created_at,
      };
    });

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[applications/mine] error:", err);
    return serverError();
  }
}
