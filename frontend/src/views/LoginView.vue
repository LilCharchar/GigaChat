<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import gigachadHero from "../assets/gigachad-login.gif";

const router = useRouter();
const authStore = useAuthStore();
const { loadingAuth, error } = storeToRefs(authStore);

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const submitted = ref(false);
const mounted = ref(false);
const shake = ref(false);

const isEmailValid = computed(() => {
  if (!email.value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
});

const isPasswordValid = computed(() => password.value.length >= 6);
const canSubmit = computed(() => isEmailValid.value && isPasswordValid.value);

onMounted(() => {
  setTimeout(() => {
    mounted.value = true;
  }, 50);
});

async function handleSubmit() {
  submitted.value = true;
  authStore.clearError();

  if (!canSubmit.value) {
    shake.value = true;
    setTimeout(() => {
      shake.value = false;
    }, 500);
    return;
  }

  const ok = await authStore.login({
    email: email.value.trim(),
    password: password.value,
  });

  if (ok) {
    router.push("/dashboard");
    return;
  }

  shake.value = true;
  setTimeout(() => {
    shake.value = false;
  }, 500);
}

function clearError() {
  submitted.value = false;
  if (error.value) authStore.clearError();
}
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
          <span class="lv-brand-status">Backend live</span>
        </div>

        <p class="lv-overline">Login for chads only</p>
        <p class="lv-copy">Rapido. Directo. Sin interfaz tibia.</p>
      </div>
    </section>

    <main class="lv-panel">
      <div class="lv-panel-inner" :class="{ 'is-shaking': shake }">
        <header class="lv-header">
          <p class="lv-panel-kicker">Acceso privado</p>
          <h2 class="lv-title">Inicia sesion</h2>
          <p class="lv-subtitle">
            Usa tu cuenta para entrar al dashboard de GigaChat.
          </p>
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
            <span>{{ loadingAuth ? "Verificando acceso..." : "Entrar al chat" }}</span>
          </button>
        </form>

        <div class="lv-footer-copy">
          <span>GigaChat / login</span>
          <span>2026</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Archivo+Black&display=swap");
</style>

<style scoped>
:global(body) {
  background:
    radial-gradient(circle at top, rgba(208, 255, 0, 0.15), transparent 30%),
    #070707;
}

.lv-page {
  --lv-bg: #070707;
  --lv-surface: rgba(12, 12, 12, 0.84);
  --lv-border: rgba(255, 255, 255, 0.09);
  --lv-text: #f5f5f5;
  --lv-muted: rgba(245, 245, 245, 0.68);
  --lv-accent: #d0ff2f;
  --lv-accent-soft: rgba(208, 255, 47, 0.18);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  min-height: 100vh;
  background: var(--lv-bg);
  color: var(--lv-text);
  font-family: "Space Grotesk", sans-serif;
  overflow: hidden;
}

.lv-hero,
.lv-panel {
  position: relative;
  min-height: 100vh;
}

.lv-hero {
  display: flex;
  align-items: flex-end;
  padding: 2.25rem;
}

.lv-hero-media,
.lv-hero-noise,
.lv-hero-gradient {
  position: absolute;
  inset: 0;
}

.lv-hero-media {
  background-image: var(--lv-hero-image);
  background-size: cover;
  background-position: center 14%;
  filter: grayscale(1) contrast(1.06) brightness(0.68);
  transform: scale(1.01);
  transition: transform 1.4s ease, filter 1.4s ease;
}

.lv-page.is-visible .lv-hero-media {
  transform: scale(1);
  filter: grayscale(1) contrast(1.1) brightness(0.74);
}

.lv-hero-noise {
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mix-blend-mode: soft-light;
}

.lv-hero-gradient {
  background:
    linear-gradient(90deg, rgba(7, 7, 7, 0.08), rgba(7, 7, 7, 0.36) 36%, rgba(7, 7, 7, 0.8) 100%),
    linear-gradient(180deg, rgba(7, 7, 7, 0.04), rgba(7, 7, 7, 0.26) 58%, rgba(7, 7, 7, 0.9) 100%),
    radial-gradient(circle at 18% 22%, rgba(208, 255, 47, 0.12), transparent 24%);
}

.lv-hero-content {
  position: relative;
  z-index: 1;
  max-width: 19rem;
  transform: translateY(32px);
  opacity: 0;
  transition: transform 0.8s ease 0.2s, opacity 0.8s ease 0.2s;
}

.lv-page.is-visible .lv-hero-content,
.lv-page.is-visible .lv-panel-inner {
  transform: translateY(0);
  opacity: 1;
}

.lv-brand-row,
.lv-footer-copy {
  display: flex;
  align-items: center;
}

.lv-brand-row {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.7rem;
}

.lv-brand-kicker,
.lv-brand-status,
.lv-panel-kicker,
.lv-toggle {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
}

.lv-brand-kicker {
  color: var(--lv-accent);
  font-weight: 700;
}

.lv-brand-status {
  color: rgba(255, 255, 255, 0.72);
}

.lv-overline {
  margin: 0 0 0.35rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lv-copy {
  margin: 0;
  max-width: 18rem;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--lv-muted);
}

.lv-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top left, rgba(208, 255, 47, 0.1), transparent 22%),
    linear-gradient(180deg, rgba(14, 14, 14, 0.96), rgba(7, 7, 7, 1));
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.lv-panel-inner {
  width: min(100%, 29rem);
  padding: 2rem 2rem 1.5rem;
  background: var(--lv-surface);
  border: 1px solid var(--lv-border);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.42);
  transform: translateY(32px);
  opacity: 0;
  transition: transform 0.8s ease 0.3s, opacity 0.8s ease 0.3s;
}

.lv-panel-inner.is-shaking {
  animation: lv-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.lv-header {
  margin-bottom: 1.6rem;
}

.lv-panel-kicker {
  margin: 0 0 0.55rem;
  color: var(--lv-accent);
  font-weight: 700;
}

.lv-title {
  margin: 0;
  font-family: "Archivo Black", sans-serif;
  font-size: clamp(2rem, 5vw, 2.8rem);
  line-height: 0.95;
  text-transform: uppercase;
  letter-spacing: -0.04em;
}

.lv-subtitle {
  margin: 0.8rem 0 0;
  color: var(--lv-muted);
  line-height: 1.6;
}

.lv-alert {
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 98, 98, 0.35);
  background: rgba(78, 16, 16, 0.45);
}

.lv-alert-text {
  margin: 0;
  color: #ffb2b2;
  line-height: 1.5;
}

.lv-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lv-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.lv-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.lv-input-shell {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.035);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.lv-input-shell:focus-within {
  border-color: rgba(208, 255, 47, 0.55);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 4px rgba(208, 255, 47, 0.08);
}

.lv-field.has-error .lv-input-shell {
  border-color: rgba(255, 98, 98, 0.5);
}

.lv-input {
  width: 100%;
  border: 0;
  outline: 0;
  padding: 1rem 1rem;
  color: var(--lv-text);
  background: transparent;
  font: inherit;
}

.lv-input::placeholder {
  color: rgba(255, 255, 255, 0.36);
}

.lv-input:disabled,
.lv-toggle:disabled,
.lv-submit:disabled {
  cursor: not-allowed;
}

.lv-input-shell--password .lv-input {
  padding-right: 6.8rem;
}

.lv-toggle {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--lv-accent);
  font-weight: 700;
  cursor: pointer;
}

.lv-feedback {
  margin: 0;
  color: #ff8b8b;
  font-size: 0.82rem;
}

.lv-submit {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  width: 100%;
  min-height: 3.4rem;
  border: 0;
  background: var(--lv-accent);
  color: #070707;
  font: inherit;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.25s ease;
}

.lv-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 40px rgba(208, 255, 47, 0.28);
}

.lv-submit:disabled {
  opacity: 0.7;
  box-shadow: none;
}

.lv-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(7, 7, 7, 0.25);
  border-top-color: #070707;
  border-radius: 999px;
  animation: lv-spin 0.7s linear infinite;
}

.lv-footer-copy {
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.lv-error-enter-active,
.lv-feedback-enter-active {
  animation: lv-slide-down 0.22s ease;
}

.lv-error-leave-active,
.lv-feedback-leave-active {
  animation: lv-slide-down 0.16s ease reverse;
}

@keyframes lv-slide-down {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes lv-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes lv-shake {
  15%,
  85% {
    transform: translateX(-3px);
  }
  30%,
  70% {
    transform: translateX(5px);
  }
  45% {
    transform: translateX(-5px);
  }
  60% {
    transform: translateX(3px);
  }
}

@media (max-width: 960px) {
  .lv-page {
    grid-template-columns: 1fr;
  }

  .lv-hero {
    min-height: 58vh;
    padding: 1.5rem;
    align-items: flex-end;
  }

  .lv-hero-gradient {
    background:
      linear-gradient(180deg, rgba(7, 7, 7, 0.08), rgba(7, 7, 7, 0.38) 58%, #070707 100%),
      radial-gradient(circle at 18% 22%, rgba(208, 255, 47, 0.12), transparent 26%);
  }

  .lv-panel {
    min-height: auto;
    margin-top: -2rem;
    padding: 0 1rem 1rem;
    border-left: 0;
  }

  .lv-panel-inner {
    width: 100%;
    padding: 1.4rem;
  }
}

@media (max-width: 640px) {
  .lv-hero {
    min-height: 52vh;
    padding: 1rem;
  }

  .lv-brand-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .lv-panel {
    margin-top: -1.5rem;
    padding-inline: 0.75rem;
  }

  .lv-input-shell--password .lv-input {
    padding-right: 5.8rem;
  }
}
</style>
