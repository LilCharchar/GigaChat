import api from "./api";

export const authService = {
  register(payload) {
    return api.post("/register", payload);
  },

  login(payload) {
    return api.post("/login", payload);
  },

  me() {
    return api.get("/me");
  },

  updateProfile(payload) {
    return api.patch("/me/profile", payload);
  },

  getAdminUser(userId) {
    return api.get(`/admin/users/${encodeURIComponent(userId)}`);
  },

  banUser(userId, reason = null) {
    return api.post(`/admin/users/${encodeURIComponent(userId)}/ban`, { reason });
  },

  timeoutUser(userId, minutes, reason = null) {
    return api.post(`/admin/users/${encodeURIComponent(userId)}/timeout`, {
      minutes,
      reason,
    });
  },

  logout() {
    return api.post("/logout");
  },
};
