import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const locale = new URL(req.url).searchParams.get("locale") ?? "ko";
    const db = createAdminClient();

    const { data: categories, error } = await db
      .from("job_categories")
      .select(`
        id, public_id, code,
        name_ko, name_en, name_vi,
        description_ko, description_en, description_vi,
        icon_url, parent_id,
        job_intro_contents(id, is_published)
      `)
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[categories GET] query error:", error);
      return serverError();
    }

    const result = (categories ?? []).map((cat) => {
      const contents = (cat.job_intro_contents ?? []) as { id: number; is_published: boolean }[];
      const hasContent = contents.some((c) => c.is_published);
      const description =
        locale === "vi" ? cat.description_vi :
        locale === "en" ? cat.description_en :
        cat.description_ko;

      return {
        id: cat.id,
        publicId: cat.public_id,
        code: cat.code,
        nameKo: cat.name_ko,
        nameEn: cat.name_en,
        nameVi: cat.name_vi,
        description: description ?? null,
        iconUrl: cat.icon_url ?? null,
        hasContent,
      };
    });

    return ok(result);
  } catch (err) {
    console.error("[categories GET] error:", err);
    return serverError();
  }
}
