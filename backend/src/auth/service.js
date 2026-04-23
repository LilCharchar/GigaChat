import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getRealtimeServer } from "../realtime/index.js";
import { userRoom } from "../realtime/rooms.js";

const ACCESS_TOKEN_EXPIRES_IN = "1h";

function mapUser(row) {
  const avatarBase64 = row.avatar ? Buffer.from(row.avatar).toString("base64") : null;

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    bio: row.bio,
    role: row.role_name || null,
    bannedAt: row.banned_at || null,
    timedOutUntil: row.timed_out_until || null,
    avatarBase64,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
  }

  return process.env.JWT_SECRET;
}

const register = async (data) => {
  const { name, username, email, password } = data;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, username, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, username, email, bio, avatar, created_at, updated_at`,
      [name, username, email, passwordHash]
    );
    return mapUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const constraint = error.constraint || "";
      const detail = error.detail || "";
      if (constraint.includes("email") || detail.includes("email")) {
        throw new Error("El email ya está registrado", { cause: error });
      }
      if (constraint.includes("username") || detail.includes("username")) {
        throw new Error("El username ya está en uso", { cause: error });
      }
    }
    throw new Error(error.message, { cause: error });
  }
};

const login = async (data) => {
  const { email, password } = data;

  const result = await pool.query(
`SELECT u.id,
             u.name,
             u.username,
             u.email,
             u.bio,
             u.avatar,
             u.password_hash,
             u.deleted_at,
             u.banned_at,
             u.timed_out_until,
             u.created_at,
             u.updated_at,
             r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
     WHERE email = $1
       AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC
     LIMIT 1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];

  if (user.banned_at) {
    throw createHttpError("Account banned", 403);
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign({ id: user.id, username: user.username }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  return {
    user: mapUser(user),
    token,
  };
};

const getCurrentUser = async (id) => {
  const result = await pool.query(
    `SELECT u.id,
            u.name,
            u.username,
            u.email,
            u.bio,
            u.avatar,
            u.deleted_at,
            u.banned_at,
            u.timed_out_until,
            u.created_at,
            u.updated_at,
            r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );

  if (result.rows.length === 0 || result.rows[0].deleted_at) {
    throw new Error("User not found");
  }

  return mapUser(result.rows[0]);
};

const updateProfile = async (id, data) => {
  const allowedFields = {
    name: "name",
    username: "username",
    bio: "bio",
    avatarBase64: "avatar",
  };

  const entries = Object.entries(data)
    .filter(([key]) => key in allowedFields)
    .map(([key, value]) => {
      if (key !== "avatarBase64") {
        return [key, value];
      }

      if (value === null) {
        return [key, null];
      }

      try {
        return [key, Buffer.from(value, "base64")];
      } catch {
        throw new Error("Invalid avatar base64");
      }
    });

  if (entries.length === 0) {
    throw new Error("No fields to update");
  }

  const assignments = entries.map(([key], index) => `${allowedFields[key]} = $${index + 2}`);
  const values = entries.map(([, value]) => value);

  try {
    const result = await pool.query(
      `UPDATE users
       SET ${assignments.join(", ")}
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id,
                 name,
                 username,
                 email,
                 bio,
                 avatar,
                 banned_at,
                 timed_out_until,
                 created_at,
                 updated_at,
                 (SELECT name FROM roles WHERE id = users.role_id) AS role_name`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return mapUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const constraint = error.constraint || "";
      const detail = error.detail || "";
      if (constraint.includes("username") || detail.includes("username")) {
        throw new Error("El username ya está en uso", { cause: error });
      }
    }

    throw error;
  }
};

const softDeleteAccount = async (id) => {
  const result = await pool.query(
    `UPDATE users
     SET deleted_at = NOW(),
         banned_at = NULL,
         banned_reason = NULL,
         banned_by = NULL,
         timed_out_until = NULL,
         timed_out_reason = NULL,
         timed_out_by = NULL
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw createHttpError("User not found", 404);
  }
};

const banUser = async ({ targetUserId, actorUserId, reason = null }) => {
  if (targetUserId === actorUserId) {
    throw createHttpError("You cannot ban yourself", 400);
  }

  const result = await pool.query(
    `UPDATE users
     SET banned_at = NOW(),
         banned_reason = $3,
         banned_by = $2
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id`,
    [targetUserId, actorUserId, reason]
  );

  if (result.rows.length === 0) {
    throw createHttpError("User not found", 404);
  }
};

const unbanUser = async (targetUserId) => {
  const result = await pool.query(
    `UPDATE users
     SET banned_at = NULL,
         banned_reason = NULL,
         banned_by = NULL
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id`,
    [targetUserId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("User not found", 404);
  }
};

const timeoutUser = async ({ targetUserId, actorUserId, minutes, reason = null }) => {
  if (targetUserId === actorUserId) {
    throw createHttpError("You cannot timeout yourself", 400);
  }

  const result = await pool.query(
    `UPDATE users
     SET timed_out_until = NOW() + ($3::text || ' minutes')::interval,
         timed_out_reason = $4,
         timed_out_by = $2
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id, timed_out_until`,
    [targetUserId, actorUserId, String(minutes), reason]
  );

  if (result.rows.length === 0) {
    throw createHttpError("User not found", 404);
  }

  const io = getRealtimeServer();
  if (io) {
    io.to(userRoom(targetUserId)).emit("account:timeout", {
      userId: targetUserId,
      timedOutUntil: result.rows[0].timed_out_until,
      reason,
    });
  }

  return result.rows[0];
};

const clearUserTimeout = async (targetUserId) => {
  const result = await pool.query(
    `UPDATE users
     SET timed_out_until = NULL,
         timed_out_reason = NULL,
         timed_out_by = NULL
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id`,
    [targetUserId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("User not found", 404);
  }

  const io = getRealtimeServer();
  if (io) {
    io.to(userRoom(targetUserId)).emit("account:timeout-cleared", {
      userId: targetUserId,
    });
  }
};

export async function assertUserCanWrite(userId) {
  const result = await pool.query(
    `SELECT deleted_at, banned_at, timed_out_until
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0 || result.rows[0].deleted_at) {
    throw createHttpError("Unauthorized", 401);
  }

  if (result.rows[0].banned_at) {
    throw createHttpError("Account banned", 403);
  }

  if (result.rows[0].timed_out_until && new Date(result.rows[0].timed_out_until) > new Date()) {
    throw createHttpError("Account timed out", 403);
  }
}

export default {
  register,
  login,
  getCurrentUser,
  updateProfile,
  softDeleteAccount,
  banUser,
  unbanUser,
  timeoutUser,
  clearUserTimeout,
};
