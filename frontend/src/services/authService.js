import api from "./api";

export const authService = {
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
