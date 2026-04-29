import {
  adminUserParamsSchema,
  banUserBodySchema,
  loginSchema,
  registerSchema,
  timeoutUserBodySchema,
  updateProfileSchema,
} from "./schemas.js";
import authService from "./service.js";
import getErrorStatus from "../shared/getErrorStatus.js";

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
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.cookie(ACCESS_COOKIE_NAME, result.token, getCookieOptions());
    res.json({ user: result.user });
  } catch (error) {
    res.status(getErrorStatus(error, 401)).json({ error: error.message });
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
    res.status(getErrorStatus(error, 404)).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.auth.id, data);
    res.json({ user });
  } catch (error) {
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const deleteMe = async (req, res) => {
  try {
    await authService.softDeleteAccount(req.auth.id);
    res.clearCookie(ACCESS_COOKIE_NAME, getCookieOptions());
    res.status(204).send();
  } catch (error) {
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const banUser = async (req, res) => {
  try {
    const { userId } = adminUserParamsSchema.parse(req.params);
    const { reason } = banUserBodySchema.parse(req.body ?? {});

    await authService.banUser({
      targetUserId: userId,
      actorUserId: req.auth.id,
      reason: reason ?? null,
    });

    res.status(204).send();
  } catch (error) {
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const unbanUser = async (req, res) => {
  try {
    const { userId } = adminUserParamsSchema.parse(req.params);
    await authService.unbanUser(userId);
    res.status(204).send();
  } catch (error) {
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const timeoutUser = async (req, res) => {
  try {
    const { userId } = adminUserParamsSchema.parse(req.params);
    const { minutes, reason } = timeoutUserBodySchema.parse(req.body ?? {});

    const timeout = await authService.timeoutUser({
      targetUserId: userId,
      actorUserId: req.auth.id,
      minutes,
      reason: reason ?? null,
    });

    res.json({ timeoutUntil: timeout.timed_out_until });
  } catch (error) {
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const clearUserTimeout = async (req, res) => {
  try {
    const { userId } = adminUserParamsSchema.parse(req.params);
    await authService.clearUserTimeout(userId);
    res.status(204).send();
  } catch (error) {
    res.status(getErrorStatus(error, 400)).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const { userId } = adminUserParamsSchema.parse(req.params);
    const user = await authService.getCurrentUser(userId);
    res.json({ user });
  } catch (error) {
    res.status(getErrorStatus(error, 404)).json({ error: error.message });
  }
};

export default {
  register,
  login,
  logout,
  me,
  updateProfile,
  deleteMe,
  banUser,
  unbanUser,
  timeoutUser,
  clearUserTimeout,
  getUser,
};
