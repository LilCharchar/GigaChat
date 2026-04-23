<script setup>
import ChatMessage from "./ChatMessage.vue";
import UserInfoPopover from "./UserInfoPopover.vue";

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
  bindMessagesContainerRef: {
    type: Function,
    default: null,
  },
  currentUserId: {
    type: String,
    default: "",
  },
  currentUserRole: {
    type: String,
    default: "",
  },
  activeConversationType: {
    type: String,
    default: "channel",
  },
  editingMessageId: {
    type: String,
    default: "",
  },
  editingMessageText: {
    type: String,
    default: "",
  },
  deletingMessageId: {
    type: String,
    default: "",
  },
  userPopover: {
    type: Object,
    default: () => ({ visible: false }),
  },
});

const emit = defineEmits([
  "update:draft",
  "send-message",
  "jump-to-latest",
  "messages-scroll",
  "user-click",
  "start-edit-message",
  "delete-message",
  "confirm-delete-message",
  "cancel-delete-message",
  "update:editing-message-text",
  "save-edit-message",
  "cancel-edit-message",
  "close-user-popover",
  "timeout-user",
  "ban-user",
]);
</script>

<template>
  <section class="dv-chat">
    <div
      :ref="bindMessagesContainerRef || messagesContainerRef"
      class="dv-messages"
      @scroll="emit('messages-scroll')"
    >
      <p v-if="!messages.length" class="dv-social-empty">Aun no hay mensajes en este chat.</p>
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :current-user-id="currentUserId"
        :current-user-role="currentUserRole"
        :active-conversation-type="activeConversationType"
        :is-editing="editingMessageId === message.id"
        :editing-text="editingMessageText"
        :is-delete-pending="deletingMessageId === message.id"
        @user-click="emit('user-click', $event)"
        @start-edit="emit('start-edit-message', $event)"
        @delete-message="emit('delete-message', $event)"
        @confirm-delete-message="emit('confirm-delete-message', $event)"
        @cancel-delete-message="emit('cancel-delete-message')"
        @update:editing-text="emit('update:editing-message-text', $event)"
        @save-edit="emit('save-edit-message', $event)"
        @cancel-edit="emit('cancel-edit-message')"
      />
    </div>

    <UserInfoPopover
      :visible="Boolean(userPopover?.visible)"
      :user="userPopover?.user || null"
      :loading="Boolean(userPopover?.loading)"
      :error="userPopover?.error || ''"
      :x="userPopover?.x || 0"
      :y="userPopover?.y || 0"
      :is-admin="Boolean(userPopover?.isAdmin)"
      @close="emit('close-user-popover')"
      @timeout-user="emit('timeout-user', $event)"
      @ban-user="emit('ban-user', $event)"
    />

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
