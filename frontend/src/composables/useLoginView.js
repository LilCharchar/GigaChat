import { computed, onBeforeUnmount, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const LOGIN_AUDIO_START_SECONDS = 0;
const LOGIN_AUDIO_DURATION_SECONDS = 12;

export function useLoginView() {
  const router = useRouter();
  const authStore = useAuthStore();
  const { loadingAuth, error } = storeToRefs(authStore);

  const email = ref("");
  const password = ref("");
  const showPassword = ref(false);
  const submitted = ref(false);
  const mounted = ref(false);
  const shake = ref(false);
  const heroVideoRef = ref(null);
  const audioRef = ref(null);
  const audioEnabled = ref(true);
  const audioAvailable = ref(true);
  const audioBlocked = ref(false);
  const heroHasStarted = ref(false);

  const isEmailValid = computed(() => {
    if (!email.value.trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  });

  const isPasswordValid = computed(() => password.value.length >= 6);
  const canSubmit = computed(() => isEmailValid.value && isPasswordValid.value);
  const isAudioMuted = computed(() => !audioEnabled.value || audioBlocked.value);

  onBeforeUnmount(() => {
    const audio = audioRef.value;
    if (audio) {
      audio.pause();
    }
  });

  async function playAudioSegment() {
    const audio = audioRef.value;
    if (!audio || !audioEnabled.value || !audioAvailable.value) return;

    audioBlocked.value = false;
    audio.pause();

    try {
      audio.currentTime = LOGIN_AUDIO_START_SECONDS;
    } catch {
      return;
    }

    try {
      await audio.play();
    } catch {
      audioBlocked.value = true;
      audioEnabled.value = false;
    }
  }

  async function toggleAudio() {
    if (!audioAvailable.value) return;

    const audio = audioRef.value;
    if (!audio) return;

    if (audioEnabled.value) {
      audioEnabled.value = false;
      audioBlocked.value = false;
      audio.pause();
      return;
    }

    audioEnabled.value = true;
    await playAudioSegment();
  }

  async function handleHeroLoad() {
    if (heroHasStarted.value) return;
    heroHasStarted.value = true;
    mounted.value = true;
    await playAudioSegment();
  }

  function handleAudioError() {
    audioAvailable.value = false;
    audioEnabled.value = false;
  }

  async function handleAudioTimeUpdate() {
    const audio = audioRef.value;
    if (!audio || !audioEnabled.value || !audioAvailable.value) return;

    if (audio.currentTime < LOGIN_AUDIO_START_SECONDS + LOGIN_AUDIO_DURATION_SECONDS) return;

    audio.currentTime = LOGIN_AUDIO_START_SECONDS;

    try {
      await audio.play();
    } catch {
      audioBlocked.value = true;
      audioEnabled.value = false;
    }
  }

  function triggerShake() {
    shake.value = true;
    setTimeout(() => {
      shake.value = false;
    }, 500);
  }

  async function handleSubmit() {
    submitted.value = true;
    authStore.clearError();

    if (!canSubmit.value) {
      triggerShake();
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

    triggerShake();
  }

  function clearError() {
    submitted.value = false;
    if (error.value) authStore.clearError();
  }

  return {
    clearError,
    email,
    error,
    handleSubmit,
    handleAudioError,
    handleHeroLoad,
    handleAudioTimeUpdate,
    isEmailValid,
    isPasswordValid,
    loadingAuth,
    mounted,
    password,
    shake,
    showPassword,
    submitted,
    audioRef,
    audioAvailable,
    heroVideoRef,
    isAudioMuted,
    toggleAudio,
  };
}
