import jwt from "jsonwebtoken";
import { getJwtSecret } from "./service.js";
import pool from "../config/db.js";

const ACCESS_COOKIE_NAME = "access_token";

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const result = await pool.query(
      `SELECT u.id, u.username, u.deleted_at, u.banned_at, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1
       LIMIT 1`,
      [payload.id]
    );

    if (result.rows.length === 0 || result.rows[0].deleted_at) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (result.rows[0].banned_at) {
      return res.status(403).json({ error: "Account banned" });
    }

    req.auth = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role_name,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
}
