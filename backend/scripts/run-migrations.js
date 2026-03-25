import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "..", "db", "migrations");

function getDatabaseConfig() {
  const { DB_HOST = "localhost", DB_PORT = "5432", DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("Missing DB_NAME, DB_USER or DB_PASSWORD in .env");
  }

  return {
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  };
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedVersions(pool) {
  const result = await pool.query("SELECT version FROM schema_migrations");
  return new Set(result.rows.map((row) => row.version));
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function applyMigration(pool, fileName) {
  const version = fileName.replace(/\.sql$/i, "");
  const migrationPath = path.join(migrationsDir, fileName);
  const sql = await fs.readFile(migrationPath, "utf8");

  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    await pool.query("COMMIT");
    console.log(`Applied migration ${version}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw new Error(`Failed migration ${version}: ${error.message}`, {
      cause: error,
    });
  }
}

async function main() {
  const pool = new Pool(getDatabaseConfig());

  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedVersions(pool);
    const files = await getMigrationFiles();

    for (const fileName of files) {
      const version = fileName.replace(/\.sql$/i, "");
      if (applied.has(version)) {
        continue;
      }
      await applyMigration(pool, fileName);
    }

    console.log("Migrations are up to date");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
