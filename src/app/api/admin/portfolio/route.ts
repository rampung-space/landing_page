import { NextRequest, NextResponse } from "next/server";
import { buildInsert, query, queryOne } from "@/lib/db/postgres";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query("SELECT * FROM portfolios ORDER BY sort_order ASC");

  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { title, slug, challenge, solution, tech_stack, tags } = body;
  if (!title || !slug || !challenge || !solution || !tech_stack?.length || !tags?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const insert = buildInsert("portfolios", {
      title: body.title,
      slug: body.slug,
      challenge: body.challenge,
      solution: body.solution,
      tech_stack: body.tech_stack,
      tags: body.tags,
      thumbnail_url: body.thumbnail_url ?? null,
      images: body.images ?? [],
      is_featured: body.is_featured ?? false,
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
    });

  const data = await queryOne(insert.text, insert.values);

  return NextResponse.json({ data }, { status: 201 });
}
