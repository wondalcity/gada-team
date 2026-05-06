import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import {
  ok,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

async function resolveLeader(db: any, teamPublicId: string, userId: number) {
  const { data: team, error } = await db
    .from("teams")
    .select("id, leader_id")
    .eq("public_id", teamPublicId)
    .is("deleted_at", null)
    .single();

  if (error || !team) return { team: null, isLeader: false };
  return { team, isLeader: team.leader_id === userId };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; schedulePublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId, schedulePublicId } = await params;
    const db = createAdminClient();

    const { team, isLeader } = await resolveLeader(db, publicId, principal.userId);
    if (!team) return notFound("팀을 찾을 수 없습니다");
    if (!isLeader) return forbidden("팀 리더만 일정을 수정할 수 있습니다");

    const { data: schedule, error: fetchError } = await db
      .from("team_work_schedules")
      .select("id")
      .eq("public_id", schedulePublicId)
      .eq("team_id", team.id)
      .single();

    if (fetchError || !schedule) return notFound("일정을 찾을 수 없습니다");

    const body = await req.json();
    const { siteName, siteAddress, workDescription, startDate, endDate, jobId, status } = body;

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (siteName !== undefined) updatePayload.site_name = siteName;
    if (siteAddress !== undefined) updatePayload.site_address = siteAddress;
    if (workDescription !== undefined) updatePayload.work_description = workDescription;
    if (startDate !== undefined) updatePayload.start_date = startDate;
    if (endDate !== undefined) updatePayload.end_date = endDate;
    if (jobId !== undefined) updatePayload.job_id = jobId;
    if (status !== undefined) {
      if (!["PLANNED", "ONGOING", "COMPLETED"].includes(status)) {
        return badRequest("status는 PLANNED, ONGOING, COMPLETED 중 하나여야 합니다");
      }
      updatePayload.status = status;
    }

    const { data: updated, error: updateError } = await db
      .from("team_work_schedules")
      .update(updatePayload)
      .eq("id", schedule.id)
      .select("id, public_id, site_name, site_address, work_description, start_date, end_date, status, job_id, created_at, updated_at")
      .single();

    if (updateError || !updated) {
      console.error("[schedules/[schedulePublicId] PUT] error:", updateError);
      return serverError();
    }

    return ok({
      publicId: updated.public_id,
      siteName: updated.site_name,
      siteAddress: updated.site_address,
      workDescription: updated.work_description,
      startDate: updated.start_date,
      endDate: updated.end_date,
      status: updated.status,
      jobId: updated.job_id,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    console.error("[schedules/[schedulePublicId] PUT] error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; schedulePublicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId, schedulePublicId } = await params;
    const db = createAdminClient();

    const { team, isLeader } = await resolveLeader(db, publicId, principal.userId);
    if (!team) return notFound("팀을 찾을 수 없습니다");
    if (!isLeader) return forbidden("팀 리더만 일정을 삭제할 수 있습니다");

    const { data: schedule, error: fetchError } = await db
      .from("team_work_schedules")
      .select("id")
      .eq("public_id", schedulePublicId)
      .eq("team_id", team.id)
      .single();

    if (fetchError || !schedule) return notFound("일정을 찾을 수 없습니다");

    const { error: deleteError } = await db
      .from("team_work_schedules")
      .delete()
      .eq("id", schedule.id);

    if (deleteError) {
      console.error("[schedules/[schedulePublicId] DELETE] error:", deleteError);
      return serverError();
    }

    return noContent();
  } catch (err) {
    console.error("[schedules/[schedulePublicId] DELETE] error:", err);
    return serverError();
  }
}
