import { NextRequest, NextResponse } from "next/server";
import { buildInsert, query, queryOne } from "@/lib/db/postgres";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query("SELECT * FROM testimonials ORDER BY sort_order ASC");

  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.client_name || !body.quote || !body.rating) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const insert = buildInsert("testimonials", {
      client_name: body.client_name,
      client_company: body.client_company ?? null,
      client_position: body.client_position ?? null,
      avatar_url: body.avatar_url ?? null,
      quote: body.quote,
      rating: body.rating,
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
    });

  const data = await queryOne(insert.text, insert.values);

  return NextResponse.json({ data }, { status: 201 });
}
