import { NextRequest, NextResponse } from "next/server";
import { query, type QueryValue } from "@/lib/db/postgres";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const SORT_COLUMNS = new Set(["created_at", "name", "phone", "company", "status", "complexity_level", "total_score"]);

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const view = searchParams.get("view");
  const page = parseInt(searchParams.get("page") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") ?? "desc";
  const status = searchParams.get("status");
  const complexity = searchParams.get("complexity");
  const search = searchParams.get("search");
  const phone = searchParams.get("phone");

  if (view === "dashboard") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [statsResult, recentSub] = await Promise.all([
      query<{
        total_submissions: string;
        new_submissions: string;
        contacted_submissions: string;
        in_progress_submissions: string;
        completed_submissions: string;
        total_portfolios: string;
        total_testimonials: string;
        submissions_this_week: string;
      }>(
        `
          SELECT
            (SELECT COUNT(*) FROM diagnostic_submissions) AS total_submissions,
            (SELECT COUNT(*) FROM diagnostic_submissions WHERE status = 'new') AS new_submissions,
            (SELECT COUNT(*) FROM diagnostic_submissions WHERE status = 'contacted') AS contacted_submissions,
            (SELECT COUNT(*) FROM diagnostic_submissions WHERE status = 'in_progress') AS in_progress_submissions,
            (SELECT COUNT(*) FROM diagnostic_submissions WHERE status = 'completed') AS completed_submissions,
            (SELECT COUNT(*) FROM portfolios) AS total_portfolios,
            (SELECT COUNT(*) FROM testimonials) AS total_testimonials,
            (SELECT COUNT(*) FROM diagnostic_submissions WHERE created_at >= $1) AS submissions_this_week
        `,
        [weekAgo]
      ),
      query("SELECT * FROM diagnostic_submissions ORDER BY created_at DESC LIMIT 5"),
    ]);

    const stats = statsResult.rows[0];

    return NextResponse.json({
      stats: {
        total_submissions: Number(stats.total_submissions),
        new_submissions: Number(stats.new_submissions),
        contacted_submissions: Number(stats.contacted_submissions),
        in_progress_submissions: Number(stats.in_progress_submissions),
        completed_submissions: Number(stats.completed_submissions),
        total_portfolios: Number(stats.total_portfolios),
        total_testimonials: Number(stats.total_testimonials),
        submissions_this_week: Number(stats.submissions_this_week),
      },
      recent: recentSub.rows,
    });
  }

  if (view === "users") {
    const result = await query<{
      phone: string;
      name: string;
      company: string | null;
      created_at: string;
    }>("SELECT phone, name, company, created_at FROM diagnostic_submissions ORDER BY created_at DESC");

    if (!result) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const map = new Map<
      string,
      { phone: string; name: string; company: string | null; total_submissions: number; last_submission: string }
    >();

    for (const row of result.rows) {
      const existing = map.get(row.phone);
      if (existing) {
        existing.total_submissions += 1;
        if (row.created_at > existing.last_submission) {
          existing.last_submission = row.created_at;
          existing.name = row.name;
          existing.company = row.company;
        }
      } else {
        map.set(row.phone, {
          phone: row.phone,
          name: row.name,
          company: row.company ?? null,
          total_submissions: 1,
          last_submission: row.created_at,
        });
      }
    }

    const users = Array.from(map.values()).sort((a, b) =>
      b.last_submission.localeCompare(a.last_submission)
    );

    return NextResponse.json({ data: users });
  }

  const where: string[] = [];
  const values: QueryValue[] = [];

  if (phone) {
    values.push(phone);
    where.push(`phone = $${values.length}`);
  }

  if (status) {
    values.push(status.split(","));
    where.push(`status = ANY($${values.length}::text[])`);
  }

  if (complexity) {
    values.push(complexity.split(","));
    where.push(`complexity_level = ANY($${values.length}::text[])`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(`(name ILIKE $${values.length} OR phone ILIKE $${values.length} OR company ILIKE $${values.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMNS.has(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "ASC" : "DESC";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM diagnostic_submissions ${whereSql}`,
    values
  );

  values.push(limit, page * limit);
  const result = await query(
    `SELECT * FROM diagnostic_submissions ${whereSql} ORDER BY ${sortColumn} ${sortOrder} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return NextResponse.json({ data: result.rows, count: Number(countResult.rows[0].count) });
}
