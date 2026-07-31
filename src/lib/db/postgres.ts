import { Pool, type QueryResultRow } from "pg";

export type QueryValue = string | number | boolean | string[] | null | Date;

declare global {
  // eslint-disable-next-line no-var
  var postgresPool: Pool | undefined;
}

function getConnectionString() {
  if (process.env.LANDING_DATABASE_URL) return process.env.LANDING_DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const database = process.env.LANDING_DB_NAME ?? process.env.POSTGRES_DB ?? "rampung_landing_db";
  const user = process.env.DB_USER ?? process.env.POSTGRES_USER ?? "postgres";
  const password = process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD ?? "minipc22mei2001";

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function getPool() {
  if (!globalThis.postgresPool) {
    globalThis.postgresPool = new Pool({
      connectionString: getConnectionString(),
    });
  }

  return globalThis.postgresPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: QueryValue[] = []
) {
  return getPool().query<T>(text, params);
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: QueryValue[] = []
) {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

export function buildInsert(table: string, data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value as QueryValue);
  const placeholders = values.map((_, index) => `$${index + 1}`);

  return {
    text: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values,
  };
}

export function buildUpdate(table: string, data: Record<string, unknown>, id: string) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const values = entries.map(([, value]) => value as QueryValue);
  const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);

  return {
    text: `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $${entries.length + 1} RETURNING *`,
    values: [...values, id],
  };
}
