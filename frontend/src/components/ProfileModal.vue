<script setup>
defineProps({
  currentUser: { type: Object, required: true },
  profileName: { type: String, default: "" },
  profileUsername: { type: String, default: "" },
  profileBio: { type: String, default: "" },
  profileAvatarPreview: { type: String, default: "" },
  profileError: { type: String, default: "" },
  profileSuccess: { type: String, default: "" },
  savingProfile: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:profileName",
  "update:profileUsername",
  "update:profileBio",
  "avatar-input",
  "remove-avatar",
  "save",
  "close",
]);
</script>

<template>
  <div class="dv-modal-backdrop" @click.self="emit('close')">
    <section class="dv-modal" role="dialog" aria-modal="true" aria-label="Editar perfil">
      <header class="dv-modal-head">
        <p class="dv-eyebrow">Perfil</p>
        <button class="dv-modal-close" type="button" @click="emit('close')">Cerrar</button>
      </header>

      <!-- Avatar -->
      <div class="dv-modal-avatar">
        <div v-if="profileAvatarPreview" class="dv-modal-avatar-preview">
          <img :src="profileAvatarPreview" alt="Vista previa del avatar" />
        </div>
        <div v-else class="dv-modal-avatar-preview is-fallback">
          {{
            (profileName || currentUser.name || currentUser.username || "G")
              .slice(0, 1)
              .toUpperCase()
          }}
        </div>

        <div class="dv-modal-avatar-actions">
          <label class="dv-modal-file-btn">
            Subir imagen
            <input type="file" accept="image/*" @change="emit('avatar-input', $event)" />
          </label>
          <button class="dv-request-btn is-reject" type="button" @click="emit('remove-avatar')">
            Quitar
          </button>
        </div>
      </div>

      <!-- Formulario -->
      <form class="dv-modal-form" @submit.prevent="emit('save')">
        <label>
          <span>Nombre</span>
          <input
            :value="profileName"
            class="dv-friend-input"
            type="text"
            maxlength="100"
            @input="emit('update:profileName', $event.target.value)"
          />
        </label>
        <label>
          <span>Username</span>
          <input
            :value="profileUsername"
            class="dv-friend-input"
            type="text"
            maxlength="30"
            @input="emit('update:profileUsername', $event.target.value)"
          />
        </label>
        <label>
          <span>Bio</span>
          <textarea
            :value="profileBio"
            class="dv-input dv-modal-bio"
            maxlength="160"
            @input="emit('update:profileBio', $event.target.value)"
          ></textarea>
        </label>

        <p v-if="profileError" class="dv-social-error">{{ profileError }}</p>
        <p v-else-if="profileSuccess" class="dv-social-empty">{{ profileSuccess }}</p>

        <div class="dv-modal-actions">
          <button class="dv-request-btn" type="button" @click="emit('close')">
            Cancelar
          </button>
          <button class="dv-send dv-modal-save" :disabled="savingProfile" type="submit">
            {{ savingProfile ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
