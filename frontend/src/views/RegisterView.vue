<script setup>
import gigachadHero from "../assets/gigachad-login-12s.mp4";
import "../assets/css/login-view.css";
import { useRegisterView } from "../composables/useRegisterView";

const {
  audioAvailable,
  audioRef,
  clearError,
  email,
  error,
  handleAudioError,
  handleAudioTimeUpdate,
  handleHeroLoad,
  handleSubmit,
  heroVideoRef,
  isAudioMuted,
  isEmailValid,
  isNameValid,
  isPasswordValid,
  isUsernameValid,
  loadingAuth,
  mounted,
  name,
  password,
  shake,
  showPassword,
  submitted,
  toggleAudio,
  username,
} = useRegisterView();
</script>

<template>
  <div class="lv-page" :class="{ 'is-visible': mounted }">
    <button
      class="lv-audio-toggle"
      type="button"
      :disabled="!audioAvailable"
      :aria-label="isAudioMuted ? 'Activar musica' : 'Silenciar musica'"
      :title="isAudioMuted ? 'Activar musica' : 'Silenciar musica'"
      @click="toggleAudio"
    >
      <span aria-hidden="true">{{ isAudioMuted ? "♪" : "♫" }}</span>
    </button>

    <section class="lv-hero">
      <video
        ref="heroVideoRef"
        class="lv-hero-media"
        :src="gigachadHero"
        muted
        autoplay
        loop
        playsinline
        preload="auto"
        aria-hidden="true"
        @loadeddata="handleHeroLoad"
      ></video>
      <div class="lv-hero-noise" aria-hidden="true"></div>
      <div class="lv-hero-gradient" aria-hidden="true"></div>

      <div class="lv-hero-content">
        <div class="lv-brand-row">
          <span class="lv-brand-kicker">GIGACHAT</span>
        </div>

        <p class="lv-overline">Registro de operadores</p>
        <p class="lv-copy">Crea tu perfil y entra directo al canal.</p>
      </div>
    </section>

    <main class="lv-panel">
      <div class="lv-panel-glow" aria-hidden="true"></div>

      <div class="lv-panel-inner" :class="{ 'is-shaking': shake }">
        <header class="lv-header">
          <div class="lv-meme-badges">
            <p class="lv-panel-kicker">Nueva cuenta</p>
          </div>

          <h2 class="lv-title">Registrarse</h2>

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
          <div class="lv-field" :class="{ 'has-error': submitted && !isNameValid }">
            <label class="lv-label" for="rv-name">Nombre de pantalla</label>
            <div class="lv-input-shell">
              <input
                id="rv-name"
                v-model="name"
                class="lv-input"
                type="text"
                placeholder="Tu nombre"
                autocomplete="name"
                :disabled="loadingAuth"
                @input="clearError"
              />
            </div>
            <Transition name="lv-feedback">
              <p v-if="submitted && !isNameValid" class="lv-feedback">
                El nombre es obligatorio (maximo 100 caracteres).
              </p>
            </Transition>
          </div>

          <div class="lv-field" :class="{ 'has-error': submitted && !isUsernameValid }">
            <label class="lv-label" for="rv-username">Username</label>
            <div class="lv-input-shell">
              <input
                id="rv-username"
                v-model="username"
                class="lv-input"
                type="text"
                placeholder="tu_username"
                autocomplete="username"
                :disabled="loadingAuth"
                @input="clearError"
              />
            </div>
            <Transition name="lv-feedback">
              <p v-if="submitted && !isUsernameValid" class="lv-feedback">
                Usa 3-30 caracteres: a-z, 0-9, _ o .
              </p>
            </Transition>
          </div>

          <div class="lv-field" :class="{ 'has-error': submitted && !isEmailValid }">
            <label class="lv-label" for="rv-email">Correo</label>
            <div class="lv-input-shell">
              <input
                id="rv-email"
                v-model="email"
                class="lv-input"
                type="email"
                placeholder="tu@correo.com"
                autocomplete="email"
                :disabled="loadingAuth"
                @input="clearError"
              />
            </div>
            <Transition name="lv-feedback">
              <p v-if="submitted && !email.trim()" class="lv-feedback">El correo es obligatorio.</p>
              <p v-else-if="submitted && !isEmailValid" class="lv-feedback">
                Ingresa un correo valido.
              </p>
            </Transition>
          </div>

          <div class="lv-field" :class="{ 'has-error': submitted && !isPasswordValid }">
            <label class="lv-label" for="rv-password">Contrasena</label>
            <div class="lv-input-shell lv-input-shell--password">
              <input
                id="rv-password"
                v-model="password"
                class="lv-input"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Minimo 8 caracteres"
                autocomplete="new-password"
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
              <p v-if="submitted && !password" class="lv-feedback">La contrasena es obligatoria.</p>
              <p v-else-if="submitted && !isPasswordValid" class="lv-feedback">
                Minimo 8 caracteres.
              </p>
            </Transition>
          </div>

          <button class="lv-submit" type="submit" :disabled="loadingAuth">
            <span v-if="loadingAuth" class="lv-spinner" aria-hidden="true"></span>
            <span>{{ loadingAuth ? "Creando..." : "Crear cuenta" }}</span>
          </button>
        </form>

        <div class="lv-switch">
          <span>Ya tienes cuenta?</span>
          <RouterLink to="/login">Inicia sesion</RouterLink>
        </div>

        <div class="lv-footer-copy">
          <span>2026</span>
        </div>
      </div>
    </main>

    <audio
      ref="audioRef"
      class="lv-audio"
      preload="auto"
      src="/audio/can-you-feel-my-heart.mp3"
      @error="handleAudioError"
      @timeupdate="handleAudioTimeUpdate"
    ></audio>
  </div>
</template>
