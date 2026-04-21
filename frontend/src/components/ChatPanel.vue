<script setup>
import ChatMessage from "./ChatMessage.vue";

defineProps({
  messages: {
    type: Array,
    required: true,
  },
  draft: {
    type: String,
    required: true,
  },
  showScrollToLatest: {
    type: Boolean,
    default: false,
  },
  pendingMessagesBelow: {
    type: Number,
    default: 0,
  },
  messagesContainerRef: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  "update:draft",
  "send-message",
  "jump-to-latest",
  "messages-scroll",
]);
</script>

<template>
  <section class="dv-chat">
    <div
      ref="messagesContainerRef"
      class="dv-messages"
      @scroll="emit('messages-scroll')"
    >
      <p v-if="!messages.length" class="dv-social-empty">
        Aun no hay mensajes en este chat.
      </p>
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>

    <button
      v-if="showScrollToLatest"
      class="dv-scroll-latest"
      type="button"
      @click="emit('jump-to-latest')"
    >
      {{ pendingMessagesBelow > 1 ? `${pendingMessagesBelow} nuevos` : "Nuevo mensaje" }}
      <span>Bajar</span>
    </button>

    <form class="dv-composer" @submit.prevent="emit('send-message')">
      <textarea
        :value="draft"
        class="dv-input"
        rows="1"
        placeholder="Escribe un mensaje"
        @input="emit('update:draft', $event.target.value)"
        @keydown.enter.exact.prevent="emit('send-message')"
      ></textarea>
      <button class="dv-send" type="submit">Enviar</button>
    </form>
  </section>
</template>
