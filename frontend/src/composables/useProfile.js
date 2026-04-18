// composables/useProfile.js
// Responsabilidad: modal de perfil, campos del formulario, avatar y guardado.

import { ref, watch } from "vue";

/**
 * Gestiona el modal de edición de perfil.
 * Recibe `currentUser` como ref para pre-poblar los campos.
 *
 * @param {{ currentUser: import("vue").Ref<object> }} deps
 */
export function useProfile({ currentUser }) {
  // Modal
  const profileModalOpen = ref(false);

  // Campos del formulario
  const profileName = ref("");
  const profileUsername = ref("");
  const profileBio = ref("");

  // Avatar
  const profileAvatarPreview = ref(null); // data URL para preview
  const profileAvatarFile = ref(null);    // File object para subir

  // Estado de guardado
  const savingProfile = ref(false);
  const profileError = ref(null);
  const profileSuccess = ref(null);

  // ── Modal ─────────────────────────────────────────────────────────────────

  function openProfileModal() {
    // Pre-poblar con los datos actuales
    profileName.value = currentUser.value.name ?? "";
    profileUsername.value = currentUser.value.username ?? "";
    profileBio.value = currentUser.value.bio ?? "";
    profileAvatarPreview.value = currentUser.value.avatarBase64
      ? `data:;base64,${currentUser.value.avatarBase64}`
      : null;
    profileError.value = null;
    profileSuccess.value = null;
    profileModalOpen.value = true;
  }

  function closeProfileModal() {
    profileModalOpen.value = false;
    profileAvatarFile.value = null;
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

  function handleAvatarInput(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    profileAvatarFile.value = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      profileAvatarPreview.value = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeAvatarFromProfile() {
    profileAvatarPreview.value = null;
    profileAvatarFile.value = null;
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  async function saveProfileChanges() {
    savingProfile.value = true;
    profileError.value = null;
    profileSuccess.value = null;
    try {
      // TODO: llamar a la API con los datos del formulario
      // await profileService.update({
      //   name: profileName.value,
      //   username: profileUsername.value,
      //   bio: profileBio.value,
      //   avatarFile: profileAvatarFile.value,
      //   removeAvatar: !profileAvatarPreview.value && !profileAvatarFile.value,
      // });

      // Actualizar el currentUser reactivo para reflejar cambios en la UI
      currentUser.value = {
        ...currentUser.value,
        name: profileName.value,
        username: profileUsername.value,
        bio: profileBio.value,
      };

      profileSuccess.value = "Perfil actualizado correctamente.";
    } catch (err) {
      profileError.value = err?.message ?? "No se pudo guardar el perfil.";
    } finally {
      savingProfile.value = false;
    }
  }

  return {
    closeProfileModal,
    handleAvatarInput,
    openProfileModal,
    profileAvatarPreview,
    profileBio,
    profileError,
    profileModalOpen,
    profileName,
    profileSuccess,
    profileUsername,
    removeAvatarFromProfile,
    saveProfileChanges,
    savingProfile,
  };
}