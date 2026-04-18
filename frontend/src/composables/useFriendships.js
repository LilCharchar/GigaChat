import { ref } from "vue";
import { friendshipService } from "../services/friendshipService";

const FRIENDSHIPS_REFRESH_MS = 8000;

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase();
}

function toAvatarDataUrl(base64) {
  if (!base64) return "";
  return `data:;base64,${base64}`;
}

function getFriendshipError(err) {
  return err?.response?.data?.error || "No fue posible cargar amistades.";
}

export function useFriendships() {
  const friends = ref([]);
  const incomingFriendRequests = ref([]);
  const outgoingFriendRequests = ref([]);
  const friendPanelTab = ref("requests");
  const requestUsername = ref("");
  const loadingFriendships = ref(false);
  const sendingFriendRequest = ref(false);
  const pendingFriendActionId = ref("");
  const removingFriendId = ref("");
  const friendshipError = ref("");
  const friendshipsSyncing = ref(false);

  let friendshipsRefreshTimer = null;

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

  function normalizeFriends(payload = []) {
    return payload.map((friend) => ({
      user_id: friend.user_id,
      username: friend.username,
      name: friend.name || friend.username,
      initials: getInitials(friend.name || friend.username),
      avatarBase64: friend.avatar_base64 || null,
      avatarUrl: toAvatarDataUrl(friend.avatar_base64),
      online: true,
    }));
  }

  async function loadFriendships({ silent = false } = {}) {
    if (friendshipsSyncing.value) return;
    friendshipsSyncing.value = true;

    if (!silent) {
      loadingFriendships.value = true;
      friendshipError.value = "";
    }

    try {
      const [incomingResponse, outgoingResponse, friendsResponse] = await Promise.all([
        friendshipService.incoming(),
        friendshipService.outgoing(),
        friendshipService.listFriends(),
      ]);

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

  function refreshFriendshipsInBackground() {
    if (document.visibilityState === "hidden") return;
    loadFriendships({ silent: true });
  }

  function startFriendshipsRefreshLoop() {
    if (friendshipsRefreshTimer) return;
    friendshipsRefreshTimer = window.setInterval(
      refreshFriendshipsInBackground,
      FRIENDSHIPS_REFRESH_MS
    );
  }

  function stopFriendshipsRefreshLoop() {
    if (!friendshipsRefreshTimer) return;
    window.clearInterval(friendshipsRefreshTimer);
    friendshipsRefreshTimer = null;
  }

  async function sendFriendRequest() {
    const username = requestUsername.value.trim().toLowerCase();
    if (!username) return;

    sendingFriendRequest.value = true;
    friendshipError.value = "";

    try {
      await friendshipService.sendRequest(username);
      requestUsername.value = "";
      await loadFriendships();
    } catch (err) {
      friendshipError.value = getFriendshipError(err);
    } finally {
      sendingFriendRequest.value = false;
    }
  }

  async function respondToFriendRequest(friendshipId, action) {
    pendingFriendActionId.value = friendshipId;
    friendshipError.value = "";

    try {
      await friendshipService.respond(friendshipId, action);
      await loadFriendships();
    } catch (err) {
      friendshipError.value = getFriendshipError(err);
    } finally {
      pendingFriendActionId.value = "";
    }
  }

  async function removeFriend(userId) {
    removingFriendId.value = userId;
    friendshipError.value = "";

    try {
      await friendshipService.removeFriend(userId);
      await loadFriendships();
    } catch (err) {
      friendshipError.value = getFriendshipError(err);
    } finally {
      removingFriendId.value = "";
    }
  }

  function setFriendPanelTab(tab) {
    friendPanelTab.value = tab;
  }

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