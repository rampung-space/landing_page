import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import pg from "pg";

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

const rl = createInterface({ input: stdin, output: stdout });

const email = (await rl.question("Admin email: ")).trim().toLowerCase();
const fullName = (await rl.question("Full name: ")).trim();
const password = (await rl.question("Password: ")).trim();
const role = (await rl.question("Role (admin/super_admin) [admin]: ")).trim() || "admin";

rl.close();

if (!email || !fullName || !password) {
  console.error("Email, full name, and password are all required.");
  process.exit(1);
}

if (role !== "admin" && role !== "super_admin") {
  console.error("Role must be 'admin' or 'super_admin'.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
const pool = new pg.Pool({ connectionString: getConnectionString() });

try {
  await pool.query(
    `
      INSERT INTO admin_users (email, full_name, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET full_name = EXCLUDED.full_name,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role
    `,
    [email, fullName, passwordHash, role]
  );
} catch (error) {
  console.error("Failed to create/update admin:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}

console.log(`Admin account ready: ${email} (${role})`);
