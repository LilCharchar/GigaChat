<script setup>
import gigachadHero from "../assets/gigachad-login.gif";
import "../assets/login-view.css";
import { useLoginView } from "../composables/useLoginView";

const {
  clearError,
  email,
  error,
  handleSubmit,
  isEmailValid,
  isPasswordValid,
  loadingAuth,
  mounted,
  password,
  shake,
  showPassword,
  submitted,
} = useLoginView();
</script>

<template>
  <div
    class="lv-page"
    :class="{ 'is-visible': mounted }"
    :style="{ '--lv-hero-image': `url(${gigachadHero})` }"
  >
    <section class="lv-hero">
      <div class="lv-hero-media" aria-hidden="true"></div>
      <div class="lv-hero-noise" aria-hidden="true"></div>
      <div class="lv-hero-gradient" aria-hidden="true"></div>

      <div class="lv-hero-content">
        <div class="lv-brand-row">
          <span class="lv-brand-kicker">GIGACHAT</span>
        </div>

        <p class="lv-overline">Login for chads only</p>
        <p class="lv-copy">Rapido. Directo. Sin interfaz tibia.</p>
      </div>
    </section>

    <main class="lv-panel">
      <div class="lv-panel-glow" aria-hidden="true"></div>

      <div class="lv-panel-inner" :class="{ 'is-shaking': shake }">
        <header class="lv-header">
          <div class="lv-meme-badges">
            <p class="lv-panel-kicker">Acceso privado</p>
          </div>

          <h2 class="lv-title">Entrar al CHAD</h2>

          <div class="lv-powerline" aria-hidden="true">
            <span class="lv-powerline-label">power</span>
            <span class="lv-powerline-bars">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>
        </header>

        <Transition name="lv-error">
          <div v-if="error" class="lv-alert" role="alert">
            <p class="lv-alert-text">{{ error }}</p>
          </div>
        </Transition>

        <form class="lv-form" novalidate @submit.prevent="handleSubmit">
          <div class="lv-field" :class="{ 'has-error': submitted && !isEmailValid }">
            <label class="lv-label" for="lv-email">Correo</label>

            <div class="lv-input-shell">
              <input
                id="lv-email"
                v-model="email"
                class="lv-input"
                type="email"
                placeholder="tu@correo.com"
                autocomplete="username"
                :disabled="loadingAuth"
                @input="clearError"
              />
            </div>

            <Transition name="lv-feedback">
              <p v-if="submitted && !email.trim()" class="lv-feedback">
                El correo es obligatorio.
              </p>
              <p v-else-if="submitted && !isEmailValid" class="lv-feedback">
                Ingresa un correo valido.
              </p>
            </Transition>
          </div>

          <div class="lv-field" :class="{ 'has-error': submitted && !isPasswordValid }">
            <label class="lv-label" for="lv-password">Contrasena</label>

            <div class="lv-input-shell lv-input-shell--password">
              <input
                id="lv-password"
                v-model="password"
                class="lv-input"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Minimo 6 caracteres"
                autocomplete="current-password"
                :disabled="loadingAuth"
                @input="clearError"
              />

              <button
                type="button"
                class="lv-toggle"
                :aria-label="showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "Ocultar" : "Mostrar" }}
              </button>
            </div>

            <Transition name="lv-feedback">
              <p v-if="submitted && !password" class="lv-feedback">
                La contrasena es obligatoria.
              </p>
              <p v-else-if="submitted && !isPasswordValid" class="lv-feedback">
                Minimo 6 caracteres.
              </p>
            </Transition>
          </div>

          <button class="lv-submit" type="submit" :disabled="loadingAuth">
            <span v-if="loadingAuth" class="lv-spinner" aria-hidden="true"></span>
            <span>{{ loadingAuth ? "Cargando..." : "Entrar" }}</span>
          </button>
        </form>

        <div class="lv-footer-copy">
          <span>2026</span>
        </div>
      </div>
    </main>

  </div>
</template>
