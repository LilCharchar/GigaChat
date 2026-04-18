// composables/useFriendships.js
// Responsabilidad: lista de amigos, solicitudes entrantes/salientes,
// envío de solicitudes, respuesta y eliminación de amigos.

import { ref } from "vue";

/**
 * Gestiona toda la lógica social (amistades).
 */
export function useFriendships() {
  const friends = ref([]);
  const incomingFriendRequests = ref([]);
  const outgoingFriendRequests = ref([]);

  const friendPanelTab = ref("requests"); // "requests" | "friends"
  const requestUsername = ref("");

  const loadingFriendships = ref(false);
  const sendingFriendRequest = ref(false);
  const pendingFriendActionId = ref(null); // id del request en proceso
  const removingFriendId = ref(null);
  const friendshipError = ref(null);

  function setFriendPanelTab(tab) {
    friendPanelTab.value = tab;
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  async function fetchFriendships() {
    loadingFriendships.value = true;
    friendshipError.value = null;
    try {
      // TODO: llamar a la API
      // const data = await friendshipService.getAll();
      // friends.value = data.friends;
      // incomingFriendRequests.value = data.incoming;
      // outgoingFriendRequests.value = data.outgoing;
    } catch (err) {
      friendshipError.value = err?.message ?? "Error al cargar amigos.";
    } finally {
      loadingFriendships.value = false;
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async function sendFriendRequest() {
    const username = requestUsername.value.trim();
    if (!username) return;
    sendingFriendRequest.value = true;
    friendshipError.value = null;
    try {
      // TODO: await friendshipService.sendRequest(username);
      requestUsername.value = "";
      await fetchFriendships();
    } catch (err) {
      friendshipError.value = err?.message ?? "No se pudo enviar la solicitud.";
    } finally {
      sendingFriendRequest.value = false;
    }
  }

  /**
   * @param {string} requestId
   * @param {"accept"|"reject"} action
   */
  async function respondToFriendRequest(requestId, action) {
    pendingFriendActionId.value = requestId;
    friendshipError.value = null;
    try {
      // TODO: await friendshipService.respond(requestId, action);
      await fetchFriendships();
    } catch (err) {
      friendshipError.value = err?.message ?? "No se pudo procesar la solicitud.";
    } finally {
      pendingFriendActionId.value = null;
    }
  }

  async function removeFriend(userId) {
    removingFriendId.value = userId;
    friendshipError.value = null;
    try {
      // TODO: await friendshipService.remove(userId);
      friends.value = friends.value.filter((f) => f.user_id !== userId);
    } catch (err) {
      friendshipError.value = err?.message ?? "No se pudo eliminar el amigo.";
    } finally {
      removingFriendId.value = null;
    }
  }

  // Carga inicial
  fetchFriendships();

  return {
    friends,
    friendPanelTab,
    friendshipError,
    incomingFriendRequests,
    loadingFriendships,
    outgoingFriendRequests,
    pendingFriendActionId,
    removingFriendId,
    requestUsername,
    sendingFriendRequest,
    fetchFriendships,
    removeFriend,
    respondToFriendRequest,
    sendFriendRequest,
    setFriendPanelTab,
  };
}