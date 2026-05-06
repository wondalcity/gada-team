import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  created,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 회사를 등록할 수 있습니다");

    const db = createAdminClient();

    // Check if already has a company
    const { data: existing } = await db
      .from("employer_profiles")
      .select("id, company_id")
      .eq("user_id", principal.userId)
      .not("company_id", "is", null)
      .maybeSingle();

    if (existing?.company_id) {
      return badRequest("이미 등록된 회사가 있습니다");
    }

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

    if (!name) return badRequest("회사명은 필수입니다");

    // Create company
    const { data: company, error: companyErr } = await db
      .from("companies")
      .insert({
        name,
        business_registration_number: businessRegistrationNumber ?? null,
        ceo_name: ceoName ?? null,
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        website_url: websiteUrl ?? null,
        description: description ?? null,
        status: "PENDING",
        is_verified: false,
      })
      .select()
      .single();

    if (companyErr || !company) {
      console.error("[companies POST] company insert error:", companyErr);
      return serverError();
    }

    // Create employer_profiles entry as OWNER
    const { error: profileErr } = await db.from("employer_profiles").upsert(
      {
        user_id: principal.userId,
        company_id: company.id,
        role: "OWNER",
        full_name: null,
        email: email ?? null,
        phone: phone ?? null,
      },
      { onConflict: "user_id" }
    );

    if (profileErr) {
      console.error("[companies POST] employer_profile upsert error:", profileErr);
      return serverError();
    }

    // Get the employer_profile id
    const { data: profile } = await db
      .from("employer_profiles")
      .select("id")
      .eq("user_id", principal.userId)
      .single();

    if (profile) {
      // Create point account with balance=0
      await db.from("employer_point_accounts").insert({
        employer_profile_id: profile.id,
        balance: 0,
        total_charged: 0,
        total_used: 0,
      });
    }

    return created(company);
  } catch (err) {
    console.error("[companies POST] error:", err);
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "EMPLOYER") return forbidden("고용주만 접근할 수 있습니다");

    const db = createAdminClient();

    const { data: profile } = await db
      .from("employer_profiles")
      .select("company_id")
      .eq("user_id", principal.userId)
      .not("company_id", "is", null)
      .maybeSingle();

    if (!profile?.company_id) {
      return ok(null);
    }

    const { data: company, error } = await db
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();

    if (error || !company) return ok(null);

    return ok(company);
  } catch (err) {
    console.error("[companies GET] error:", err);
    return serverError();
  }
}
