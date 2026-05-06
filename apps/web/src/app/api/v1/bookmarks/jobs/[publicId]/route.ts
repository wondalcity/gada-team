import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  created,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    // Find job by public_id
    const { data: job, error: jobError } = await db
      .from("jobs")
      .select("id, public_id, title")
      .eq("public_id", publicId)
      .single();

    if (jobError || !job) return notFound("공고를 찾을 수 없습니다");

    // Check if already bookmarked
    const { data: existing } = await db
      .from("job_bookmarks")
      .select("id")
      .eq("user_id", principal.userId)
      .eq("job_id", job.id)
      .single();

    if (existing) return badRequest("이미 북마크된 공고입니다");

    const { data: bookmark, error: insertError } = await db
      .from("job_bookmarks")
      .insert({
        user_id: principal.userId,
        job_id: job.id,
      })
      .select("id, created_at")
      .single();

    if (insertError || !bookmark) {
      console.error("[bookmarks/jobs/[publicId] POST] error:", insertError);
      return serverError();
    }

    return created({
      bookmarkId: bookmark.id,
      jobPublicId: publicId,
      bookmarkedAt: bookmark.created_at,
    });
  } catch (err) {
    console.error("[bookmarks/jobs/[publicId] POST] error:", err);
    return serverError();
  }
}

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

    // Find job by public_id
    const { data: job, error: jobError } = await db
      .from("jobs")
      .select("id")
      .eq("public_id", publicId)
      .single();

    if (jobError || !job) return notFound("공고를 찾을 수 없습니다");

    const { data: bookmark, error: fetchError } = await db
      .from("job_bookmarks")
      .select("id")
      .eq("user_id", principal.userId)
      .eq("job_id", job.id)
      .single();

    if (fetchError || !bookmark) return notFound("북마크를 찾을 수 없습니다");

    const { error: deleteError } = await db
      .from("job_bookmarks")
      .delete()
      .eq("id", bookmark.id);

    if (deleteError) {
      console.error("[bookmarks/jobs/[publicId] DELETE] error:", deleteError);
      return serverError();
    }

    return noContent();
  } catch (err) {
    console.error("[bookmarks/jobs/[publicId] DELETE] error:", err);
    return serverError();
  }
}
