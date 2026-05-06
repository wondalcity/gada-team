import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ok, serverError } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  try {
    const db = createAdminClient();

    const { data, error } = await db
      .from("job_categories")
      .select("id, code, name_ko, name_vi, parent_id")
      .order("id", { ascending: true });

    if (error) {
      console.error("[categories GET] query error:", error);
      return serverError();
    }

    return ok(data ?? []);
  } catch (err) {
    console.error("[categories GET] error:", err);
    return serverError();
  }
}
