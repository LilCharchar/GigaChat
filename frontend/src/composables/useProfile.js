import { computed, ref } from "vue";

export function useProfile({ currentUser, authStore }) {
  const profileModalOpen = ref(false);
  const savingProfile = ref(false);
  const profileError = ref("");
  const profileSuccess = ref("");
  const profileName = ref("");
  const profileUsername = ref("");
  const profileBio = ref("");
  const profileAvatarBase64 = ref(null);
  const profileAvatarMode = ref("unchanged");

  const profileAvatarPreview = computed(() => {
    if (profileAvatarMode.value === "removed") return "";

    const currentAvatar =
      profileAvatarMode.value === "updated"
        ? profileAvatarBase64.value
        : currentUser.value.avatarBase64;

    if (!currentAvatar) return "";
    return `data:;base64,${currentAvatar}`;
  });

  function openProfileModal() {
    profileError.value = "";
    profileSuccess.value = "";
    profileName.value = currentUser.value.name || "";
    profileUsername.value = currentUser.value.username || "";
    profileBio.value = currentUser.value.bio || "";
    profileAvatarBase64.value = null;
    profileAvatarMode.value = "unchanged";
    profileModalOpen.value = true;
  }

  function closeProfileModal() {
    profileModalOpen.value = false;
    profileError.value = "";
    profileSuccess.value = "";
    profileAvatarBase64.value = null;
    profileAvatarMode.value = "unchanged";
  }

  async function handleAvatarInput(event) {
    profileError.value = "";
    const [file] = event?.target?.files || [];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      profileError.value = "Selecciona un archivo de imagen valido.";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      profileError.value = "La imagen no debe superar 2MB.";
      return;
    }

    const result = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No fue posible leer la imagen."));
      reader.readAsDataURL(file);
    });

    if (typeof result !== "string" || !result.includes(",")) {
      profileError.value = "No fue posible procesar la imagen.";
      return;
    }

    profileAvatarBase64.value = result.split(",")[1] || null;
    profileAvatarMode.value = "updated";
  }

  function removeAvatarFromProfile() {
    profileError.value = "";
    profileAvatarBase64.value = null;
    profileAvatarMode.value = "removed";
  }

  async function saveProfileChanges() {
    profileError.value = "";
    profileSuccess.value = "";
    savingProfile.value = true;

    const payload = {};
    const nextName = profileName.value.trim();
    const nextUsername = profileUsername.value.trim().toLowerCase();
    const nextBio = profileBio.value.trim() || null;

    if (nextName && nextName !== (currentUser.value.name || "")) {
      payload.name = nextName;
    }

    if (nextUsername && nextUsername !== (currentUser.value.username || "")) {
      payload.username = nextUsername;
    }

    if (nextBio !== (currentUser.value.bio || null)) {
      payload.bio = nextBio;
    }

    if (profileAvatarMode.value === "updated") {
      payload.avatarBase64 = profileAvatarBase64.value;
    } else if (profileAvatarMode.value === "removed") {
      payload.avatarBase64 = null;
    }

    if (!Object.keys(payload).length) {
      savingProfile.value = false;
      profileError.value = "No hay cambios para guardar.";
      return;
    }

    const response = await authStore.updateProfile(payload);
    savingProfile.value = false;

    if (!response.ok) {
      profileError.value = response.error || "No fue posible guardar el perfil.";
      return;
    }

    profileSuccess.value = "Perfil actualizado.";
    profileModalOpen.value = false;
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