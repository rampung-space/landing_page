import type { NextRequest } from "next/server";
import { sessionCookie, verifySessionToken, type AdminSessionPayload } from "./session";
import { queryOne } from "@/lib/db/postgres";

export async function resolveAdminSession(
  session: AdminSessionPayload | null
): Promise<AdminSessionPayload | null> {
  if (!session) return null;

  const admin = await queryOne<AdminSessionPayload>(
    "SELECT id, email, full_name, role FROM admin_users WHERE id = $1",
    [session.id]
  );

  if (!admin) return null;

  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: admin.role,
  };
}

export async function requireAdmin(request: NextRequest): Promise<AdminSessionPayload | null> {
  const token = request.cookies.get(sessionCookie.name)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return resolveAdminSession(session);
}
