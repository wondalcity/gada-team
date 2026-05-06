import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    // Verify ownership
    const { data: company } = await db
      .from("companies")
      .select("id, public_id")
      .eq("public_id", publicId)
      .single();

    if (!company) return notFound("회사를 찾을 수 없습니다");

    const { data: profile } = await db
      .from("employer_profiles")
      .select("company_id")
      .eq("user_id", principal.userId)
      .eq("company_id", company.id)
      .maybeSingle();

    if (!profile) return forbidden("이 회사를 수정할 권한이 없습니다");

    const body = await req.json();
    const {
      name,
      businessRegistrationNumber,
      ceoName,
      address,
      phone,
      email,
      websiteUrl,
      description,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (businessRegistrationNumber !== undefined)
      updateData.business_registration_number = businessRegistrationNumber;
    if (ceoName !== undefined) updateData.ceo_name = ceoName;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (websiteUrl !== undefined) updateData.website_url = websiteUrl;
    if (description !== undefined) updateData.description = description;

    const { data: updated, error } = await db
      .from("companies")
      .update(updateData)
      .eq("id", company.id)
      .select()
      .single();

    if (error || !updated) {
      console.error("[companies PUT] update error:", error);
      return serverError();
    }

    return ok(updated);
  } catch (err) {
    console.error("[companies PUT] error:", err);
    return serverError();
  }
}
