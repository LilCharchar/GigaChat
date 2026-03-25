import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const { DB_HOST = "localhost", DB_PORT = "5432", DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
  throw new Error("Missing DB_NAME, DB_USER or DB_PASSWORD in .env");
}

const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
});

export default pool;
