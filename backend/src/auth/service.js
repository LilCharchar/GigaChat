import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = "1h";

function mapUser(row) {
  const avatarBase64 = row.avatar ? Buffer.from(row.avatar).toString("base64") : null;

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    bio: row.bio,
    avatarBase64,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
      const detail = error.detail || "";
      if (detail.includes("email")) {
        throw new Error("El email ya está registrado", { cause: error });
      }
      if (detail.includes("username")) {
        throw new Error("El username ya está en uso", { cause: error });
      }
    }
    throw new Error(error.message, { cause: error });
  }
};

const login = async (data) => {
  const { email, password } = data;

  const result = await pool.query(
    `SELECT id, name, username, email, bio, avatar, password_hash, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];
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
    `SELECT id, name, username, email, bio, avatar, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
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
       RETURNING id, name, username, email, bio, avatar, created_at, updated_at`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return mapUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const detail = error.detail || "";
      if (detail.includes("username")) {
        throw new Error("El username ya está en uso", { cause: error });
      }
    }

    throw error;
  }
};

export default { register, login, getCurrentUser, updateProfile };
