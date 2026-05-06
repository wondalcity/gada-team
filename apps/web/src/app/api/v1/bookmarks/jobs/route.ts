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
      .from("job_bookmarks")
      .select(
        `
        id,
        created_at,
        jobs(
          public_id,
          title,
          status,
          pay_min,
          pay_max,
          pay_unit,
          sites(
            sido,
            sigungu,
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
      console.error("[bookmarks/jobs GET] error:", error);
      return serverError();
    }

    const content = (data ?? []).map((row: any) => ({
      bookmarkId: row.id,
      publicId: row.jobs?.public_id ?? null,
      title: row.jobs?.title ?? null,
      companyName: row.jobs?.sites?.companies?.name ?? null,
      sido: row.jobs?.sites?.sido ?? null,
      sigungu: row.jobs?.sites?.sigungu ?? null,
      payMin: row.jobs?.pay_min ?? null,
      payMax: row.jobs?.pay_max ?? null,
      payUnit: row.jobs?.pay_unit ?? null,
      status: row.jobs?.status ?? null,
      bookmarkedAt: row.created_at,
    }));

    return paginated(content, page, size, count ?? 0);
  } catch (err) {
    console.error("[bookmarks/jobs GET] error:", err);
    return serverError();
  }
}
