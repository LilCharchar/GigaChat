import jwt from "jsonwebtoken";
import { getJwtSecret } from "./service.js";

const ACCESS_COOKIE_NAME = "access_token";

export function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.auth = { id: payload.id, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
