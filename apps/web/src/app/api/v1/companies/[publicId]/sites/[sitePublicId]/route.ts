import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api-response";

async function getSiteAndVerifyOwner(
  db: ReturnType<typeof createAdminClient>,
  companyPublicId: string,
  sitePublicId: string,
  userId: number
) {
  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("public_id", companyPublicId)
    .single();

  if (!company) return { site: null, owned: false };

  const { data: site } = await db
    .from("sites")
    .select("*")
    .eq("public_id", sitePublicId)
    .eq("company_id", company.id)
    .single();

  if (!site) return { site: null, owned: false };

  const { data: profile } = await db
    .from("employer_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", company.id)
    .maybeSingle();

  return { site, owned: !!profile };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; sitePublicId: string }> }
) {
  try {
    const { publicId, sitePublicId } = await params;
    const db = createAdminClient();

    const { data: company } = await db
      .from("companies")
      .select("id")
      .eq("public_id", publicId)
      .single();

    if (!company) return notFound("회사를 찾을 수 없습니다");

    const { data: site, error } = await db
      .from("sites")
      .select("*")
      .eq("public_id", sitePublicId)
      .eq("company_id", company.id)
      .single();

    if (error || !site) return notFound("현장을 찾을 수 없습니다");

    return ok(site);
  } catch (err) {
    console.error("[site GET] error:", err);
    return serverError();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; sitePublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { publicId, sitePublicId } = await params;
    const db = createAdminClient();

    const { site, owned } = await getSiteAndVerifyOwner(
      db,
      publicId,
      sitePublicId,
      principal.userId
    );

    if (!site) return notFound("현장을 찾을 수 없습니다");
    if (!owned) return forbidden("이 현장을 수정할 권한이 없습니다");

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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (addressDetail !== undefined) updateData.address_detail = addressDetail;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (sido !== undefined) updateData.sido = sido;
    if (sigungu !== undefined) updateData.sigungu = sigungu;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;

    const { data: updated, error } = await db
      .from("sites")
      .update(updateData)
      .eq("id", site.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[site PUT] update error:", error);
      return serverError();
    }

    return ok(updated);
  } catch (err) {
    console.error("[site PUT] error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; sitePublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { publicId, sitePublicId } = await params;
    const db = createAdminClient();

    const { site, owned } = await getSiteAndVerifyOwner(
      db,
      publicId,
      sitePublicId,
      principal.userId
    );

    if (!site) return notFound("현장을 찾을 수 없습니다");
    if (!owned) return forbidden("이 현장을 삭제할 권한이 없습니다");

    const { error } = await db
      .from("sites")
      .update({ status: "COMPLETED" })
      .eq("id", site.id);

    if (error) {
      console.error("[site DELETE] error:", error);
      return serverError();
    }

    return noContent();
  } catch (err) {
    console.error("[site DELETE] error:", err);
    return serverError();
  }
}
