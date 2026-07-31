import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/postgres";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookie } from "@/lib/auth/session";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/auth/loginRateLimit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  if (isRateLimited(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." },
      { status: 429 }
    );
  }

  const admin = await queryOne<{
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: "super_admin" | "admin";
  }>(
    "SELECT id, email, password_hash, full_name, role FROM admin_users WHERE email = $1",
    [email]
  );

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    recordFailedAttempt(email);
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  clearAttempts(email);

  const token = await createSessionToken({
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: admin.role,
  });

  const response = NextResponse.json({
    data: { id: admin.id, email: admin.email, full_name: admin.full_name, role: admin.role },
  });
  response.cookies.set(sessionCookie.name, token, {
    ...sessionCookie.options,
    maxAge: sessionCookie.maxAge,
  });
  return response;
}
