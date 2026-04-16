import { registerSchema, loginSchema, updateProfileSchema } from "./schemas.js";
import authService from "./service.js";

const ACCESS_COOKIE_NAME = "access_token";

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 60 * 60 * 1000,
  };
}

const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.cookie(ACCESS_COOKIE_NAME, result.token, getCookieOptions());
    res.json({ user: result.user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const logout = (req, res) => {
  res.clearCookie(ACCESS_COOKIE_NAME, getCookieOptions());
  res.json({ message: "Logout successful" });
};

const me = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.auth.id);
    res.json({ user });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.auth.id, data);
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default { register, login, logout, me, updateProfile };
