<script setup>
import { onMounted, ref } from "vue";
import DashboardView from "./components/DashboardView.vue";
import LoginView from "./components/LoginView.vue";
import api from "./services/api";

const user = ref(null);
const loadingSession = ref(true);
const loadingLogout = ref(false);
const appError = ref("");

const restoreSession = async () => {
  loadingSession.value = true;
  appError.value = "";

  try {
    const response = await api.get("/me");
    user.value = response?.data?.user ?? null;
  } catch {
    user.value = null;
  } finally {
    loadingSession.value = false;
  }
};

const handleLoggedIn = (loggedUser) => {
  user.value = loggedUser;
  appError.value = "";
};

const handleLogout = async () => {
  loadingLogout.value = true;
  appError.value = "";

  try {
    await api.post("/logout");
    user.value = null;
  } catch (err) {
    appError.value = err?.response?.data?.error || "No fue posible cerrar sesion.";
  } finally {
    loadingLogout.value = false;
  }
};

onMounted(restoreSession);
</script>

<template>
  <main v-if="loadingSession" class="boot-screen">
    <div class="boot-card">
      <p class="brand">GigaChat</p>
      <p>Verificando sesion activa...</p>
    </div>
  </main>

  <template v-else>
    <p v-if="appError" class="app-error">{{ appError }}</p>

    <DashboardView v-if="user" :user="user" :loading-logout="loadingLogout" @logout="handleLogout" />
    <LoginView v-else @logged-in="handleLoggedIn" />
  </template>
</template>

<style scoped>
.boot-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f3f4f6;
}

.boot-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 22px;
  text-align: center;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}

.brand {
  margin: 0 0 8px;
  color: #b45309;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
}

.app-error {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #9f1239;
  border-radius: 8px;
  padding: 10px 14px;
  z-index: 20;
}
</style>
