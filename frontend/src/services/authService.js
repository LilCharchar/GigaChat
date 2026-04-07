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

  logout() {
    return api.post("/logout");
  },
};
