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
} from "@/lib/api-response";

async function resolveTeamAndCheckMembership(
  db: any,
  publicId: string,
  userId: number
) {
  const { data: team, error: teamError } = await db
    .from("teams")
    .select("id, leader_id")
    .eq("public_id", publicId)
    .is("deleted_at", null)
    .single();

  if (teamError || !team) return { team: null, isLeader: false, isMember: false };

  const isLeader = team.leader_id === userId;

  const { data: memberRow } = await db
    .from("team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("user_id", userId)
    .eq("invitation_status", "ACCEPTED")
    .single();

  return { team, isLeader, isMember: !!memberRow || isLeader };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const principal = await getAuthenticatedUser(req);
    if (!principal) return unauthorized();
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { team, isMember } = await resolveTeamAndCheckMembership(db, publicId, principal.userId);
    if (!team) return notFound("팀을 찾을 수 없습니다");
    if (!isMember) return forbidden("팀 멤버만 일정을 조회할 수 있습니다");

    const { data: schedules, error } = await db
      .from("team_work_schedules")
      .select(
        `
        id,
        public_id,
        site_name,
        site_address,
        work_description,
        start_date,
        end_date,
        status,
        job_id,
        created_at,
        updated_at
      `
      )
      .eq("team_id", team.id)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("[teams/[publicId]/schedules GET] error:", error);
      return serverError();
    }

    return ok(
      (schedules ?? []).map((s: any) => ({
        publicId: s.public_id,
        siteName: s.site_name,
        siteAddress: s.site_address,
        workDescription: s.work_description,
        startDate: s.start_date,
        endDate: s.end_date,
        status: s.status,
        jobId: s.job_id,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }))
    );
  } catch (err) {
    console.error("[teams/[publicId]/schedules GET] error:", err);
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
    if (principal.role !== "WORKER") return forbidden("근로자만 접근할 수 있습니다");

    const { publicId } = await params;
    const db = createAdminClient();

    const { team, isLeader } = await resolveTeamAndCheckMembership(db, publicId, principal.userId);
    if (!team) return notFound("팀을 찾을 수 없습니다");
    if (!isLeader) return forbidden("팀 리더만 일정을 생성할 수 있습니다");

    const body = await req.json();
    const { siteName, siteAddress, workDescription, startDate, endDate, jobId, status } = body;

    if (!siteName) return badRequest("siteName은 필수입니다");
    if (!startDate) return badRequest("startDate는 필수입니다");

    const { data: schedule, error: insertError } = await db
      .from("team_work_schedules")
      .insert({
        team_id: team.id,
        site_name: siteName,
        site_address: siteAddress ?? null,
        work_description: workDescription ?? null,
        start_date: startDate,
        end_date: endDate ?? null,
        job_id: jobId ?? null,
        status: status ?? "PLANNED",
      })
      .select("id, public_id, site_name, site_address, work_description, start_date, end_date, status, job_id, created_at, updated_at")
      .single();

    if (insertError || !schedule) {
      console.error("[teams/[publicId]/schedules POST] error:", insertError);
      return serverError();
    }

    return created({
      publicId: schedule.public_id,
      siteName: schedule.site_name,
      siteAddress: schedule.site_address,
      workDescription: schedule.work_description,
      startDate: schedule.start_date,
      endDate: schedule.end_date,
      status: schedule.status,
      jobId: schedule.job_id,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    });
  } catch (err) {
    console.error("[teams/[publicId]/schedules POST] error:", err);
    return serverError();
  }
}
