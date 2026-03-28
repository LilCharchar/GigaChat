import { computed, onMounted, ref } from "vue";
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
