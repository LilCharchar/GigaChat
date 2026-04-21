import { ref } from "vue";
import { friendshipService } from "../services/friendshipService";

// Intervalo de actualización automática de amistades (8 segundos)
const FRIENDSHIPS_REFRESH_MS = 8000;

// Obtiene las iniciales de un nombre completo (máximo 2 palabras)
// Ejemplo: "Juan Pérez" → "JP"
function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase();
}

// Convierte un string base64 en una URL de datos para mostrar imágenes
function toAvatarDataUrl(base64) {
  if (!base64) return "";
  return `data:;base64,${base64}`;
}

// Extrae el mensaje de error de una respuesta HTTP fallida
function getFriendshipError(err) {
  return err?.response?.data?.error || "No fue posible cargar amistades.";
}

export function useFriendships() {
  // --- Estado reactivo ---
  const friends = ref([]);                        // Lista de amigos confirmados
  const incomingFriendRequests = ref([]);         // Solicitudes de amistad recibidas
  const outgoingFriendRequests = ref([]);         // Solicitudes de amistad enviadas
  const friendPanelTab = ref("requests");         // Pestaña activa del panel de amigos
  const requestUsername = ref("");                // Username ingresado para enviar solicitud
  const loadingFriendships = ref(false);          // Indica carga inicial en curso
  const sendingFriendRequest = ref(false);        // Indica que se está enviando una solicitud
  const pendingFriendActionId = ref("");          // ID de la solicitud siendo aceptada/rechazada
  const removingFriendId = ref("");              // ID del amigo siendo eliminado
  const friendshipError = ref("");               // Mensaje de error visible al usuario
  const friendshipsSyncing = ref(false);         // Bloqueo para evitar peticiones simultáneas

  // Referencia al timer del intervalo de actualización
  let friendshipsRefreshTimer = null;

  // Normaliza las solicitudes entrantes al formato interno de la app
  function normalizeIncomingRequests(payload = []) {
    return payload.map((request) => ({
      id: request.id,
      username: request.requester_username,
      name: request.requester_name || request.requester_username,
      initials: getInitials(request.requester_name || request.requester_username),
      avatarBase64: request.requester_avatar_base64 || null,
      avatarUrl: toAvatarDataUrl(request.requester_avatar_base64),
    }));
  }

  // Normaliza las solicitudes salientes al formato interno de la app
  function normalizeOutgoingRequests(payload = []) {
    return payload.map((request) => ({
      id: request.id,
      username: request.addressee_username,
      name: request.addressee_name || request.addressee_username,
      initials: getInitials(request.addressee_name || request.addressee_username),
      avatarBase64: request.addressee_avatar_base64 || null,
      avatarUrl: toAvatarDataUrl(request.addressee_avatar_base64),
    }));
  }

  // Normaliza la lista de amigos al formato interno de la app
  function normalizeFriends(payload = []) {
    return payload.map((friend) => ({
      user_id: friend.user_id,
      username: friend.username,
      name: friend.name || friend.username,
      initials: getInitials(friend.name || friend.username),
      avatarBase64: friend.avatar_base64 || null,
      avatarUrl: toAvatarDataUrl(friend.avatar_base64),
      online: true, // TODO: estado online real aún no implementado
    }));
  }

  // Carga todas las amistades desde la API en paralelo.
  // Con silent=true no modifica el estado de carga ni muestra errores (para refresco en segundo plano)
  async function loadFriendships({ silent = false } = {}) {
    if (friendshipsSyncing.value) return; // Evita llamadas concurrentes
    friendshipsSyncing.value = true;

    if (!silent) {
      loadingFriendships.value = true;
      friendshipError.value = "";
    }

    try {
      // Hace las 3 peticiones a la API de forma simultánea para mayor eficiencia
      const [incomingResponse, outgoingResponse, friendsResponse] = await Promise.all([
        friendshipService.incoming(),
        friendshipService.outgoing(),
        friendshipService.listFriends(),
      ]);

      // Actualiza el estado con los datos normalizados
      incomingFriendRequests.value = normalizeIncomingRequests(
        incomingResponse?.data?.requests ?? []
      );
      outgoingFriendRequests.value = normalizeOutgoingRequests(
        outgoingResponse?.data?.requests ?? []
      );
      friends.value = normalizeFriends(friendsResponse?.data?.friends ?? []);
    } catch (err) {
      if (!silent) {
        friendshipError.value = getFriendshipError(err);
      }
    } finally {
      if (!silent) loadingFriendships.value = false;
      friendshipsSyncing.value = false;
    }
  }

  // Actualiza amistades silenciosamente, pero solo si la pestaña está visible
  function refreshFriendshipsInBackground() {
    if (document.visibilityState === "hidden") return;
    loadFriendships({ silent: true });
  }

  // Inicia el intervalo de actualización periódica en segundo plano
  // Si ya existe un timer activo, no crea uno nuevo
  function startFriendshipsRefreshLoop() {
    if (friendshipsRefreshTimer) return;
    friendshipsRefreshTimer = window.setInterval(
      refreshFriendshipsInBackground,
      FRIENDSHIPS_REFRESH_MS
    );
  }

  // Detiene el intervalo de actualización y limpia la referencia
  function stopFriendshipsRefreshLoop() {
    if (!friendshipsRefreshTimer) return;
    window.clearInterval(friendshipsRefreshTimer);
    friendshipsRefreshTimer = null;
  }

  // Envía una solicitud de amistad al username ingresado
  async function sendFriendRequest() {
    const username = requestUsername.value.trim().toLowerCase();
    if (!username) return; // No hace nada si el campo está vacío

    sendingFriendRequest.value = true;
    friendshipError.value = "";

    try {
      await friendshipService.sendRequest(username);
      requestUsername.value = ""; // Limpia el campo tras el envío exitoso
      await loadFriendships();    // Recarga para reflejar la nueva solicitud saliente
    } catch (err) {
      friendshipError.value = getFriendshipError(err);
    } finally {
      sendingFriendRequest.value = false;
    }
  }

  // Acepta o rechaza una solicitud de amistad entrante
  // action puede ser "accept" o "reject"
  async function respondToFriendRequest(friendshipId, action) {
    pendingFriendActionId.value = friendshipId; // Marca cuál solicitud está en proceso
    friendshipError.value = "";

    try {
      await friendshipService.respond(friendshipId, action);
      await loadFriendships(); // Recarga para reflejar el cambio
    } catch (err) {
      friendshipError.value = getFriendshipError(err);
    } finally {
      pendingFriendActionId.value = "";
    }
  }

  // Elimina a un amigo por su userId
  async function removeFriend(userId) {
    removingFriendId.value = userId; // Marca qué amigo está siendo eliminado
    friendshipError.value = "";

    try {
      await friendshipService.removeFriend(userId);
      await loadFriendships(); // Recarga para reflejar la eliminación
    } catch (err) {
      friendshipError.value = getFriendshipError(err);
    } finally {
      removingFriendId.value = "";
    }
  }

  // Cambia la pestaña activa del panel de amigos
  function setFriendPanelTab(tab) {
    friendPanelTab.value = tab;
  }

  // Expone el estado y las funciones para ser usados en los componentes
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
    loadFriendships,
    refreshFriendshipsInBackground,
    removeFriend,
    respondToFriendRequest,
    sendFriendRequest,
    setFriendPanelTab,
    startFriendshipsRefreshLoop,
    stopFriendshipsRefreshLoop,
  };
}