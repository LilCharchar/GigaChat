import pool from "../config/db.js";
import bcrypt from "bcrypt";

const register = async (data) => {
  const { name, username, email, password } = data;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, username, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, username, email, created_at`,
      [name, username, email, passwordHash]
    );
    return result.rows[0];
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
    `SELECT id, username, email, password_hash FROM users WHERE email = $1`,
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

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
};

export default { register, login };
