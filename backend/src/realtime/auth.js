import jwt from "jsonwebtoken";
import { getJwtSecret } from "../auth/service.js";

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

export function authenticateSocket(socket, next) {
  try {
    const rawCookie = socket.handshake.headers?.cookie;
    const cookies = parseCookies(rawCookie);
    const token = cookies[ACCESS_COOKIE_NAME];

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const payload = jwt.verify(token, getJwtSecret());
    socket.user = { id: payload.id, username: payload.username };
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
}
