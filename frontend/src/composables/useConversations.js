// composables/useConversations.js
// Responsabilidad: canales globales, DMs, selección de conversación activa y socket.

import { ref, computed } from "vue";

/**
 * Gestiona la lista de canales y mensajes directos.
 * Expone la conversación activa y la función para seleccionarla.
 */
export function useConversations() {
  const conversations = ref([]);       // Canales globales
  const dms = ref([]);                  // Mensajes directos
  const activeConversationId = ref(null);

  const loadingChat = ref(false);
  const loadingDMs = ref(false);
  const chatError = ref(null);
  const socketConnected = ref(false);

  const activeConversation = computed(() =>
    [...conversations.value, ...dms.value].find(
      (c) => c.id === activeConversationId.value
    ) ?? null
  );

  function selectConversation(id) {
    activeConversationId.value = id;
  }

  async function fetchConversations() {
    loadingChat.value = true;
    chatError.value = null;
    try {
      // TODO: cargar canales desde la API
      // conversations.value = await chatService.getChannels();
    } catch (err) {
      chatError.value = err?.message ?? "Error al cargar los canales.";
    } finally {
      loadingChat.value = false;
    }
  }

  async function fetchDMs() {
    loadingDMs.value = true;
    try {
      // TODO: cargar DMs desde la API
      // dms.value = await chatService.getDMs();
    } finally {
      loadingDMs.value = false;
    }
  }

  /**
   * Abre (o crea) un DM con un amigo y lo selecciona.
   * @param {string} friendUserId
   * @param {string} friendName
   * @param {string} friendUsername
   */
  async function openDMWithFriend(friendUserId, friendName, friendUsername) {
    // TODO: crear/obtener el DM y agregar a la lista si no existe
    // const dm = await chatService.getOrCreateDM(friendUserId);
    // if (!dms.value.find((d) => d.id === dm.id)) dms.value.push(dm);
    // selectConversation(dm.id);
  }

  // Carga inicial
  fetchConversations();
  fetchDMs();

  return {
    activeConversation,
    activeConversationId,
    chatError,
    conversations,
    dms,
    loadingChat,
    loadingDMs,
    socketConnected,
    fetchConversations,
    fetchDMs,
    openDMWithFriend,
    selectConversation,
  };
}