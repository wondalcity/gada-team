import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/lib/auth-server";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const principal = await getAdminPrincipal(req);
    if (!principal) return unauthorized("관리자 권한이 필요합니다");

    const db = createAdminClient();

    const [
      { count: totalUsers },
      { count: totalCompanies },
      { count: activeJobs },
      { count: totalApplications },
      { count: pendingCompanies },
      { count: pendingChargeRequests },
    ] = await Promise.all([
      db.from("users").select("*", { count: "exact", head: true }).is("deleted_at", null),
      db.from("companies").select("*", { count: "exact", head: true }),
      db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
      db.from("applications").select("*", { count: "exact", head: true }),
      db.from("companies").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      db
        .from("point_charge_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING"),
    ]);

    return ok({
      totalUsers: totalUsers ?? 0,
      totalCompanies: totalCompanies ?? 0,
      activeJobs: activeJobs ?? 0,
      totalApplications: totalApplications ?? 0,
      pendingCompanies: pendingCompanies ?? 0,
      pendingChargeRequests: pendingChargeRequests ?? 0,
    });
  } catch (err) {
    console.error("[admin/dashboard GET] error:", err);
    return serverError();
  }
}
