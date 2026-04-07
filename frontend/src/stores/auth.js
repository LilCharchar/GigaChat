import { defineStore } from "pinia";
import { authService } from "../services/authService";

const DEFAULT_ERROR = "No fue posible procesar la autenticacion.";

function mapError(err) {
  return err?.response?.data?.error || err?.message || DEFAULT_ERROR;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loadingSession: false,
    loadingAuth: false,
    sessionChecked: false,
    error: "",
  }),

  actions: {
    clearError() {
      this.error = "";
    },

    setError(message) {
      this.error = message;
    },

    async ensureSession() {
      if (this.sessionChecked) {
        return;
      }

      await this.restoreSession();
    },

    async restoreSession() {
      this.loadingSession = true;
      this.error = "";

      try {
        const response = await authService.me();
        this.user = response?.data?.user ?? null;
      } catch {
        this.user = null;
      } finally {
        this.loadingSession = false;
        this.sessionChecked = true;
      }
    },

    async login(credentials) {
      this.loadingAuth = true;
      this.error = "";

      try {
        const response = await authService.login(credentials);
        const loggedUser = response?.data?.user;

        if (!loggedUser) {
          throw new Error("No se recibio el usuario autenticado.");
        }

        this.user = loggedUser;
        this.sessionChecked = true;
        return true;
      } catch (err) {
        this.error = mapError(err);
        return false;
      } finally {
        this.loadingAuth = false;
      }
    },

    async register(payload) {
      this.loadingAuth = true;
      this.error = "";

      try {
        await authService.register(payload);
        const loginResponse = await authService.login({
          email: payload.email,
          password: payload.password,
        });

        const loggedUser = loginResponse?.data?.user;
        if (!loggedUser) {
          throw new Error("No se recibio el usuario autenticado.");
        }

        this.user = loggedUser;
        this.sessionChecked = true;
        return true;
      } catch (err) {
        this.error = mapError(err);
        return false;
      } finally {
        this.loadingAuth = false;
      }
    },

    async logout() {
      this.loadingAuth = true;
      this.error = "";

      try {
        await authService.logout();
        this.user = null;
        this.sessionChecked = true;
        return true;
      } catch (err) {
        this.error = mapError(err);
        return false;
      } finally {
        this.loadingAuth = false;
      }
    },
  },
});
