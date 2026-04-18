// composables/useMessages.js
// Responsabilidad: mensajes de la conversación activa, borrador, envío y scroll.

import { ref, watch, nextTick } from "vue";

/**
 * Gestiona los mensajes del chat activo.
 * Recibe `activeConversationId` como ref para reaccionar a cambios de sala.
 *
 * @param {{ activeConversationId: import("vue").Ref<string|null> }} deps
 */
export function useMessages({ activeConversationId }) {
  const activeMessages = ref([]);
  const draft = ref("");

  // Scroll
  const messagesContainerRef = ref(null);
  const showScrollToLatest = ref(false);
  const pendingMessagesBelow = ref(0);

  // ── Scroll helpers ────────────────────────────────────────────────────────

  function isNearBottom(threshold = 120) {
    const el = messagesContainerRef.value;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }

  async function scrollToBottom(force = false) {
    await nextTick();
    const el = messagesContainerRef.value;
    if (!el) return;
    if (force || isNearBottom()) {
      el.scrollTop = el.scrollHeight;
      showScrollToLatest.value = false;
      pendingMessagesBelow.value = 0;
    }
  }

  function jumpToLatestMessages() {
    scrollToBottom(true);
  }

  function onMessagesScroll() {
    if (isNearBottom()) {
      showScrollToLatest.value = false;
      pendingMessagesBelow.value = 0;
    }
  }

  // ── Mensajes ──────────────────────────────────────────────────────────────

  async function fetchMessages(conversationId) {
    if (!conversationId) return;
    activeMessages.value = [];
    // TODO: cargar mensajes desde la API
    // activeMessages.value = await chatService.getMessages(conversationId);
    await scrollToBottom(true);
  }

  /**
   * Llámalo cuando llegue un mensaje nuevo por socket.
   * @param {object} message
   */
  function receiveMessage(message) {
    const wasNearBottom = isNearBottom();
    activeMessages.value.push(message);
    if (wasNearBottom) {
      scrollToBottom();
    } else {
      showScrollToLatest.value = true;
      pendingMessagesBelow.value += 1;
    }
  }

  async function sendMessage() {
    const text = draft.value.trim();
    if (!text || !activeConversationId.value) return;
    draft.value = "";
    // TODO: enviar por socket o API
    // await chatService.sendMessage(activeConversationId.value, text);
  }

  // Recargar mensajes cuando cambie la conversación activa
  watch(activeConversationId, (id) => fetchMessages(id), { immediate: true });

  return {
    activeMessages,
    draft,
    messagesContainerRef,
    pendingMessagesBelow,
    showScrollToLatest,
    jumpToLatestMessages,
    onMessagesScroll,
    receiveMessage,
    sendMessage,
  };
}