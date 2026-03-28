<script setup>
import { ref } from "vue";
import api from "../services/api";

const emit = defineEmits(["logged-in"]);

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const getErrorMessage = (err) => {
  if (err?.response?.data?.error) {
    return err.response.data.error;
  }

  if (err?.message) {
    return err.message;
  }

  return "No fue posible iniciar sesion. Intenta otra vez.";
};

const submitLogin = async () => {
  error.value = "";

  if (!email.value.trim() || !password.value) {
    error.value = "Completa correo y contrasena para continuar.";
    return;
  }

  loading.value = true;

  try {
    const response = await api.post("/login", {
      email: email.value.trim(),
      password: password.value,
    });

    const user = response?.data?.user;

    if (!user) {
      throw new Error("No se recibio el usuario autenticado.");
    }

    emit("logged-in", user);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <p class="eyebrow">GigaChat</p>
      <h1>Bienvenido de vuelta</h1>
      <p class="subtitle">Inicia sesion para entrar a tu espacio.</p>

      <form class="form" @submit.prevent="submitLogin">
        <label for="email">Correo electronico</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="tu_correo@dominio.com"
          autocomplete="username"
        />

        <label for="password">Contrasena</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Tu contrasena"
          autocomplete="current-password"
        />

        <button class="submit" type="submit" :disabled="loading">
          {{ loading ? "Validando acceso..." : "Entrar" }}
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>
      <p class="hint">Conecta con tu backend en <code>VITE_API_URL</code> (por defecto usa http://localhost:3000).</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 0% 0%, #ffe3b8 0%, transparent 45%),
    radial-gradient(circle at 100% 100%, #d2f2ff 0%, transparent 45%),
    #f7f7f8;
}

.login-card {
  width: min(440px, 100%);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 16px 40px rgba(17, 24, 39, 0.12);
}

.eyebrow {
  margin: 0;
  font-weight: 800;
  color: #b45309;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
}

h1 {
  margin: 10px 0 8px;
  color: #111827;
  font-size: 30px;
  line-height: 1.1;
}

.subtitle {
  margin: 0 0 20px;
  color: #4b5563;
}

.form {
  display: grid;
  gap: 10px;
}

label {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
}

input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus {
  outline: none;
  border-color: #ea580c;
  box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.15);
}

.submit {
  margin-top: 6px;
  border: 0;
  border-radius: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #ea580c, #f97316);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #be123c;
  font-weight: 600;
}

.hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: #6b7280;
}

code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 6px;
}
</style>
