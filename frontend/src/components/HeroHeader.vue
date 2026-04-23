<script setup>
defineProps({
  conversationName: { type: String, default: "Global" },
  conversationType: { type: String, default: "" },
  socketConnected: { type: Boolean, default: false },
});
</script>

<template>
  <div class="dv-hero">
    <div class="dv-hero-copy">
      <p class="dv-eyebrow">Chat</p>
      <h2>{{ conversationName }}</h2>
      <p class="dv-social-empty">Socket: {{ socketConnected ? "conectado" : "desconectado" }}</p>
    </div>
  </div>
</template>
