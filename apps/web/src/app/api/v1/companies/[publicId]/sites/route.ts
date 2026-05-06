import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  created,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
  paginated,
} from "@/lib/api-response";

async function getCompanyAndVerifyOwner(
  db: ReturnType<typeof createAdminClient>,
  publicId: string,
  userId: number,
  requireOwnership: boolean
) {
  const { data: company } = await db
    .from("companies")
    .select("id, public_id")
    .eq("public_id", publicId)
    .single();

  if (!company) return { company: null, owned: false };

  if (!requireOwnership) return { company, owned: true };

  const { data: profile } = await db
    .from("employer_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", company.id)
    .maybeSingle();

  return { company, owned: !!profile };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const db = createAdminClient();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "20", 10);

    const { data: company } = await db
      .from("companies")
      .select("id")
      .eq("public_id", publicId)
      .single();

    if (!company) return notFound("회사를 찾을 수 없습니다");

    const { data, error, count } = await db
      .from("sites")
      .select("*", { count: "exact" })
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .range(page * size, (page + 1) * size - 1);

    if (error) {
      console.error("[sites GET] query error:", error);
      return serverError();
    }

    return paginated(data ?? [], page, size, count ?? 0);
  } catch (err) {
    console.error("[sites GET] error:", err);
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 현장을 등록할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { company, owned } = await getCompanyAndVerifyOwner(
      db,
      publicId,
      principal.userId,
      true
    );

    if (!company) return notFound("회사를 찾을 수 없습니다");
    if (!owned) return forbidden("이 회사에 현장을 등록할 권한이 없습니다");

    const body = await req.json();
    const {
      name,
      address,
      addressDetail,
      latitude,
      longitude,
      description,
      status,
      sido,
      sigungu,
      startDate,
      endDate,
    } = body;

    if (!name) return badRequest("현장명은 필수입니다");
    if (!address) return badRequest("주소는 필수입니다");

    const { data: site, error } = await db
      .from("sites")
      .insert({
        company_id: company.id,
        name,
        address,
        address_detail: addressDetail ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        description: description ?? null,
        status: status ?? "ACTIVE",
        sido: sido ?? null,
        sigungu: sigungu ?? null,
        start_date: startDate ?? null,
        end_date: endDate ?? null,
      })
      .select()
      .single();

    if (error || !site) {
      console.error("[sites POST] insert error:", error);
      return serverError();
    }

    return created(site);
  } catch (err) {
    console.error("[sites POST] error:", err);
    return serverError();
  }
}
