import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const principal = await getAuthenticatedUser(req);
  if (!principal) return unauthorized();

  return ok({
    userId: principal.userId,
    publicId: principal.publicId,
    phone: principal.phone,
    role: principal.role,
    firebaseUid: principal.firebaseUid,
    email: principal.email,
  });
}
