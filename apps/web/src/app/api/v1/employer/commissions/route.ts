import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden } from "@/lib/api-response";

// Commission feature has been removed. This endpoint returns an empty list as a placeholder.
export async function GET(req: NextRequest) {
  const principal = await getAuthenticatedUser(req);
  if (!principal) return unauthorized();
  if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

  return ok({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    isFirst: true,
    isLast: true,
  });
}
