<script setup>
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

import "./css/login.css";

const router    = useRouter();
const authStore = useAuthStore();
const { loadingAuth, error } = storeToRefs(authStore);

const email    = ref("");
const password = ref("");

const submitLogin = async () => {
  authStore.clearError();

  if (!email.value.trim() || !password.value) {
    authStore.setError("Completa correo y contrasena para continuar.");
    return;
  }

  const ok = await authStore.login({
    email:    email.value.trim(),
    password: password.value,
  });

  if (ok) {
    router.push("/dashboard");
  }
};
</script>

<template>
  <main class="gl-page">
    <!-- Watermark tipogrÃ¡fico gigante â€” identidad visual GigaChat -->
    <div class="gl-watermark" aria-hidden="true">G</div>

    <!-- Layout centrado -->
    <div class="gl-layout">

      <!-- Header editorial -->
      <header class="gl-header">
        <!-- Logo mark -->
        <div class="gl-logo">
          <span class="gl-logo-glyph">G</span>
          <span class="gl-logo-label">Gigachat</span>
        </div>

        <!-- Eyebrow + headline -->
        <p class="gl-eyebrow">Acceso seguro</p>
        <h1 class="gl-headline">
          Bienvenido<br />de vuelta.
        </h1>
        <p class="gl-subtitle">
          Inicia sesiÃ³n para entrar a tu espacio.
        </p>
      </header>

      <!-- Formulario -->
      <form class="gl-form" @submit.prevent="submitLogin" novalidate>

        <!-- Correo electrÃ³nico -->
        <div class="gl-field">
          <label class="gl-label" for="email">
            Correo electrÃ³nico
          </label>
          <input
            id="email"
            class="gl-input"
            v-model="email"
            type="email"
            placeholder="tu_correo@dominio.com"
            autocomplete="username"
            :disabled="loadingAuth"
            required
          />
        </div>

        <!-- ContraseÃ±a -->
        <div class="gl-field gl-field-last">
          <label class="gl-label" for="password">
            ContraseÃ±a
          </label>
          <input
            id="password"
            class="gl-input"
            v-model="password"
            type="password"
            placeholder="Tu contrasena"
            autocomplete="current-password"
            :disabled="loadingAuth"
            required
          />
        </div>

        <!-- Submit -->
        <button
          class="gl-submit"
          :class="{ loading: loadingAuth }"
          type="submit"
          :disabled="loadingAuth"
        >
          <span v-if="loadingAuth" class="gl-spinner" aria-hidden="true" />
          <span>{{ loadingAuth ? "Validando acceso..." : "Entrar" }}</span>
        </button>

      </form>

      <!-- Error -->
      <div v-if="error" class="gl-error" role="alert">
        <div class="gl-error-dot" aria-hidden="true" />
        <p class="gl-error-text">{{ error }}</p>
      </div>

      <!-- Hint -->
      <div class="gl-hint">
        <p class="gl-hint-text">
          Conecta con tu backend en
          <code>VITE_API_URL</code>
          &nbsp;Â·&nbsp; por defecto&nbsp;
          <code>http://localhost:3000</code>
        </p>
      </div>

    </div>

    <!-- Barra de status inferior -->
    <footer class="gl-bottom" aria-hidden="true">
      <span class="gl-bottom-left">GigaChat Â· v1.0</span>
      <span class="gl-bottom-right">
        <span class="gl-status-dot" />
        sistema operativo
      </span>
    </footer>
  </main>
</template>


