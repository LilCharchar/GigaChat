// composables/useAuth.js
// Responsabilidad: estado del usuario autenticado y cierre de sesión.

import { ref } from "vue";

/**
 * Gestiona la sesión del usuario.
 * Expone `currentUser`, `loadingAuth` y `handleLogout`.
 */
export function useAuth() {
  const currentUser = ref({
    name: "",
    username: "",
    email: "",
    avatarBase64: null,
  });

  const loadingAuth = ref(false);

  async function handleLogout() {
    loadingAuth.value = true;
    try {
      // TODO: llamar al endpoint de logout
      // await authService.logout();
    } finally {
      loadingAuth.value = false;
    }
  }

  async function fetchCurrentUser() {
    // TODO: cargar datos del usuario autenticado
    // const data = await authService.me();
    // currentUser.value = data;
  }

  // Carga inicial
  fetchCurrentUser();

  return {
    currentUser,
    loadingAuth,
    handleLogout,
    fetchCurrentUser,
  };
}