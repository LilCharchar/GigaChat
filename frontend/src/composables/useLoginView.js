import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

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
  const cursorX = ref(0);
  const cursorY = ref(0);
  const cursorVisible = ref(false);
  const customCursorEnabled = ref(false);

  const isEmailValid = computed(() => {
    if (!email.value.trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  });

  const isPasswordValid = computed(() => password.value.length >= 6);
  const canSubmit = computed(() => isEmailValid.value && isPasswordValid.value);

  function supportsCustomCursor() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches &&
      window.innerWidth > 960
    );
  }

  function updateCursorCapability() {
    customCursorEnabled.value = supportsCustomCursor();

    if (!customCursorEnabled.value) {
      cursorVisible.value = false;
    }
  }

  function handlePointerMove(event) {
    if (!customCursorEnabled.value) return;
    cursorX.value = event.clientX;
    cursorY.value = event.clientY;
    cursorVisible.value = true;
  }

  function handlePointerLeave() {
    cursorVisible.value = false;
  }

  onMounted(() => {
    setTimeout(() => {
      mounted.value = true;
    }, 50);

    updateCursorCapability();
    window.addEventListener("resize", updateCursorCapability);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseleave", handlePointerLeave);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateCursorCapability);
    window.removeEventListener("mousemove", handlePointerMove);
    window.removeEventListener("mouseleave", handlePointerLeave);
  });

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
    cursorVisible,
    cursorX,
    cursorY,
    customCursorEnabled,
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
  };
}
