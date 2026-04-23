import jwt from "jsonwebtoken";
import { getJwtSecret } from "../auth/service.js";
import pool from "../config/db.js";

const ACCESS_COOKIE_NAME = "access_token";

function parseCookies(rawCookie) {
  if (!rawCookie) {
    return {};
  }

  return rawCookie.split(";").reduce((acc, chunk) => {
    const [rawKey, ...rawValue] = chunk.trim().split("=");

    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

export async function authenticateSocket(socket, next) {
  try {
    const rawCookie = socket.handshake.headers?.cookie;
    const cookies = parseCookies(rawCookie);
    const token = cookies[ACCESS_COOKIE_NAME];

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const payload = jwt.verify(token, getJwtSecret());
    const result = await pool.query(
      `SELECT id, username, deleted_at, banned_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [payload.id]
    );

    if (result.rows.length === 0 || result.rows[0].deleted_at || result.rows[0].banned_at) {
      return next(new Error("Unauthorized"));
    }

    socket.user = { id: result.rows[0].id, username: result.rows[0].username };
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
}
