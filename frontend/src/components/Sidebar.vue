<script setup>
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  currentUser: { type: Object, required: true },
  conversations: { type: Array, required: true },
  dms: { type: Array, required: true },
  activeConversationId: { type: String, default: "" },
  loadingChat: { type: Boolean, default: false },
  loadingDMs: { type: Boolean, default: false },
  loadingAuth: { type: Boolean, default: false },
  chatError: { type: String, default: "" },
});

const visibleChatError = ref(props.chatError);
let clearErrorTimer = null;

watch(
  () => props.chatError,
  (nextError) => {
    if (clearErrorTimer) {
      clearTimeout(clearErrorTimer);
      clearErrorTimer = null;
    }

    visibleChatError.value = nextError;

    if (nextError) {
      clearErrorTimer = setTimeout(() => {
        visibleChatError.value = "";
        clearErrorTimer = null;
      }, 5000);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (clearErrorTimer) {
    clearTimeout(clearErrorTimer);
  }
});

const emit = defineEmits(["select-conversation", "open-profile", "logout"]);
</script>

<template>
  <aside class="dv-sidebar">
    <!-- Marca -->
    <div class="dv-brand">
      <p class="dv-eyebrow">Gigachat</p>
      <h1>Chadline</h1>
    </div>

    <!-- Usuario -->
    <section
      class="dv-user"
      role="button"
      tabindex="0"
      @click="emit('open-profile')"
      @keydown.enter.prevent="emit('open-profile')"
    >
      <div v-if="currentUser.avatarBase64" class="dv-user-mark dv-user-mark-avatar">
        <img
          class="dv-user-avatar"
          :src="`data:;base64,${currentUser.avatarBase64}`"
          alt="Avatar de perfil"
        />
      </div>
      <div v-else class="dv-user-mark">
        {{
          (currentUser.name || currentUser.username || currentUser.email || "G")
            .slice(0, 1)
            .toUpperCase()
        }}
      </div>
      <div>
        <strong>{{ currentUser.name || "Operador" }}</strong>
        <p>{{ currentUser.username ? `@${currentUser.username}` : "@sin-username" }}</p>
      </div>
    </section>

    <!-- Canales -->
    <section class="dv-list-block">
      <div class="dv-head">
        <span>Canales</span>
        <span>{{ conversations.length }}</span>
      </div>

      <p v-if="loadingChat" class="dv-social-empty">Cargando chat global...</p>
      <p v-else-if="visibleChatError" class="dv-social-error">{{ visibleChatError }}</p>

      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        class="dv-room"
        :class="{ 'is-active': conversation.id === activeConversationId }"
        type="button"
        @click="emit('select-conversation', conversation.id)"
      >
        <strong>{{ conversation.name }}</strong>
        <span v-if="conversation.unread">{{ conversation.unread }}</span>
      </button>
    </section>

    <!-- Mensajes directos -->
    <section class="dv-list-block">
      <div class="dv-head">
        <span>Mensajes Directos</span>
        <span>{{ dms.length }}</span>
      </div>

      <p v-if="loadingDMs" class="dv-social-empty">Cargando DMs...</p>

      <button
        v-for="dm in dms"
        :key="dm.id"
        class="dv-room dv-dm-item"
        :class="{ 'is-active': dm.id === activeConversationId }"
        type="button"
        @click="emit('select-conversation', dm.id)"
      >
        <div class="dv-dm-avatar">
          <img v-if="dm.avatarBase64" :src="`data:;base64,${dm.avatarBase64}`" :alt="dm.name" />
          <span v-else>{{ (dm.name || "?").slice(0, 1).toUpperCase() }}</span>
        </div>
        <strong>{{ dm.name }}</strong>
      </button>

      <p v-if="!dms.length && !loadingDMs" class="dv-social-empty">
        No hay DMs. Inicia un chat desde la lista de amigos.
      </p>
    </section>

    <!-- Logout -->
    <button class="dv-logout" :disabled="loadingAuth" type="button" @click="emit('logout')">
      {{ loadingAuth ? "Saliendo..." : "Cerrar sesion" }}
    </button>
  </aside>
</template>
