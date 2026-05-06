import { NextResponse } from "next/server";

export function ok<T>(data: T, meta?: object) {
  return NextResponse.json({ statusCode: 200, data, ...(meta ? { meta } : {}) });
}

export function created<T>(data: T) {
  return NextResponse.json({ statusCode: 201, data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function unauthorized(message = "인증이 필요합니다") {
  return NextResponse.json({ statusCode: 401, message }, { status: 401 });
}

export function forbidden(message = "권한이 없습니다") {
  return NextResponse.json({ statusCode: 403, message }, { status: 403 });
}

export function notFound(message = "찾을 수 없습니다") {
  return NextResponse.json({ statusCode: 404, message }, { status: 404 });
}

export function badRequest(message = "잘못된 요청입니다") {
  return NextResponse.json({ statusCode: 400, message }, { status: 400 });
}

export function serverError(message = "서버 오류가 발생했습니다") {
  return NextResponse.json({ statusCode: 500, message }, { status: 500 });
}

export function paginated<T>(
  content: T[],
  page: number,
  size: number,
  total: number
) {
  const totalPages = Math.ceil(total / size);
  return ok(
    {
      content,
      page,
      size,
      totalElements: total,
      totalPages,
      isFirst: page === 0,
      isLast: page >= totalPages - 1,
    }
  );
}
