<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const { user, loadingAuth } = storeToRefs(authStore);

const currentUser = computed(() => user.value ?? {});

const handleLogout = async () => {
  const ok = await authStore.logout();

  if (ok) {
    router.push("/login");
  }
};
</script>

<template>
  <main class="dashboard-page">
    <section class="dashboard-card">
      <p class="tag">Sesion activa</p>
      <h1>Bienvenido, {{ currentUser.username }}</h1>
      <p class="subtitle">Esta es una vista privada de muestra despues del login.</p>

      <div class="grid">
        <article class="stat">
          <h2>ID</h2>
          <p>{{ currentUser.id }}</p>
        </article>

        <article class="stat">
          <h2>Email</h2>
          <p>{{ currentUser.email }}</p>
        </article>
      </div>

      <button class="logout" :disabled="loadingAuth" @click="handleLogout">
        {{ loadingAuth ? "Cerrando sesion..." : "Cerrar sesion" }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 20% 20%, #ffe8c4 0%, #fff8ea 38%, #f4f6fb 100%);
}

.dashboard-card {
  width: min(760px, 100%);
  background: #ffffff;
  border: 1px solid #ece7dd;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.1);
}

.tag {
  display: inline-block;
  background: #fff3dc;
  color: #885c00;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 700;
  margin-bottom: 10px;
}

h1 {
  margin: 0;
  color: #1f2937;
}

.subtitle {
  color: #4b5563;
  margin: 10px 0 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stat {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: #fafafa;
}

.stat h2 {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.04em;
}

.stat p {
  margin: 0;
  word-break: break-all;
  color: #111827;
}

.logout {
  margin-top: 22px;
  border: 0;
  border-radius: 10px;
  padding: 11px 15px;
  background: #111827;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.logout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
