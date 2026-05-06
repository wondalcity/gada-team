import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  noContent,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api-response";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    // Fetch application and verify ownership
    const { data: application, error: fetchError } = await db
      .from("applications")
      .select("id, user_id, status")
      .eq("public_id", publicId)
      .single();

    if (fetchError || !application) return notFound("지원서를 찾을 수 없습니다");
    if (application.user_id !== principal.userId) return forbidden("본인의 지원서만 취소할 수 있습니다");
    if (application.status === "WITHDRAWN") return forbidden("이미 취소된 지원서입니다");

    const { error: updateError } = await db
      .from("applications")
      .update({ status: "WITHDRAWN" })
      .eq("id", application.id);

    if (updateError) {
      console.error("[applications/[publicId] DELETE] error:", updateError);
      return serverError();
    }

    // Record status history
    await db.from("application_status_history").insert({
      application_id: application.id,
      from_status: application.status,
      to_status: "WITHDRAWN",
      note: "지원자 취소",
    });

    return noContent();
  } catch (err) {
    console.error("[applications/[publicId] DELETE] error:", err);
    return serverError();
  }
}
