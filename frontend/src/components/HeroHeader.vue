<script setup>
const props = defineProps({
  conversationName: { type: String, default: "Global" },
  conversationType: { type: String, default: "" },
  conversationId: { type: String, default: "" },
  socketConnected: { type: Boolean, default: false },
  clearingDM: { type: Boolean, default: false },
});

const emit = defineEmits(["clear-dm"]);

function confirmClearDM() {
  const confirmed = window.confirm(
    `Se borrará el historial del chat con ${props.conversationName}. Esta acción no se puede deshacer.`
  );

  if (!confirmed) return;
  emit("clear-dm", props.conversationId);
}
</script>

<template>
  <div class="dv-hero">
    <div class="dv-hero-copy">
      <p class="dv-eyebrow">Chat</p>
      <h2>{{ conversationName }}</h2>
      <p class="dv-social-empty">Socket: {{ socketConnected ? "conectado" : "desconectado" }}</p>
    </div>

    <button
      v-if="conversationType === 'dm'"
      class="dv-clear-dm"
      :disabled="clearingDM"
      type="button"
      :title="`Limpiar historial de mensajes con ${conversationName}`"
      @click="confirmClearDM"
    >
      {{ clearingDM ? "Limpiando..." : "Limpiar chat" }}
    </button>
  </div>
</template>
