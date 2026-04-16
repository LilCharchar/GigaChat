import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { friendshipService } from "../services/friendshipService";
import { chatService } from "../services/chatService";
import { chatSocketService } from "../services/chatSocketService";

const FRIENDSHIPS_REFRESH_MS = 8000;
const AUTO_SCROLL_BOTTOM_THRESHOLD = 120;

const EMPTY_METRICS = [
  { label: "Mensajes", value: "0" },
  { label: "Latencia", value: "-" },
  { label: "Estado", value: "Activo" },
];

function createDefaultConversation(chat) {
  return {
    id: chat.id,
    name: chat.title || "Global",
    topic: "Chat global de la comunidad.",
    status: "En linea",
    mode: "global relay",
    members: 0,
    unread: 0,
    updatedAt: "Ahora",
    signalBars: ["0.5rem", "0.9rem", "1.3rem", "1.7rem", "1.2rem"],
    pinnedTitle: "Canal Global",
    pinnedNote: "Usa este canal para probar flujo realtime end-to-end.",
    metrics: structuredClone(EMPTY_METRICS),
    roster: [],
    messages: [],
    type: "channel",
  };
}

function createDMConversation(dm, friendName, friendUsername) {
  return {
    id: dm.id,
    name: friendName || friendUsername || "Usuario",
    topic: `Conversación directa con ${friendName || friendUsername}`,
    status: "En línea",
    mode: "direct message",
    members: 1,
    unread: 0,
    updatedAt: "Ahora",
    signalBars: ["0.5rem", "0.9rem", "1.3rem", "1.7rem", "1.2rem"],
    pinnedTitle: `DM: ${friendName || friendUsername}`,
    pinnedNote: "Conversación privada con tu amigo.",
    metrics: structuredClone(EMPTY_METRICS),
    roster: [],
    messages: [],
    type: "dm",
    friendName,
    friendUsername,
  };
}

function nowLabel() {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function timeLabelFromDate(value) {
  if (!value) {
    return nowLabel();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return nowLabel();
  }

  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase();
}

function getFriendshipError(err) {
  return err?.response?.data?.error || "No fue posible cargar amistades.";
}

export function useDashboardView() {
  const router = useRouter();
  const authStore = useAuthStore();
  const { user, loadingAuth } = storeToRefs(authStore);

  const conversations = ref([]);
  const activeConversationId = ref("");
  const draft = ref("");
  const friendPanelTab = ref("requests");
  const incomingFriendRequests = ref([]);
  const outgoingFriendRequests = ref([]);
  const friends = ref([]);
  const requestUsername = ref("");
  const loadingFriendships = ref(false);
  const sendingFriendRequest = ref(false);
  const pendingFriendActionId = ref("");
  const removingFriendId = ref("");
  const friendshipError = ref("");
  const friendshipsSyncing = ref(false);
  const loadingChat = ref(false);
  const chatError = ref("");
  const socketConnected = ref(false);
  const loadingDMs = ref(false);
  const dms = ref([]);
  const messagesContainerRef = ref(null);
  const showScrollToLatest = ref(false);
  const pendingMessagesBelow = ref(0);
  const profileModalOpen = ref(false);
  const savingProfile = ref(false);
  const profileError = ref("");
  const profileSuccess = ref("");
  const profileName = ref("");
  const profileUsername = ref("");
  const profileBio = ref("");
  const profileAvatarBase64 = ref(null);
  const profileAvatarMode = ref("unchanged");

  let friendshipsRefreshTimer = null;
  let socketUnsubscribeMessageNew = null;
  let socketUnsubscribeConnect = null;
  let socketUnsubscribeDisconnect = null;

  const currentUser = computed(() => user.value ?? {});
  const profileAvatarPreview = computed(() => {
    if (profileAvatarMode.value === "removed") return "";

    const currentAvatar =
      profileAvatarMode.value === "updated"
        ? profileAvatarBase64.value
        : currentUser.value.avatarBase64;

    if (!currentAvatar) return "";
    return `data:;base64,${currentAvatar}`;
  });

  const activeConversation = computed(
    () =>
      conversations.value.find((conversation) => conversation.id === activeConversationId.value) ??
      dms.value.find((dm) => dm.id === activeConversationId.value) ??
      null
  );

  const activeMessages = computed(() =>
    (activeConversation.value?.messages ?? []).map((message) => ({
      ...message,
      initials: getInitials(message.author),
    }))
  );

  const activeRoster = computed(() =>
    friends.value.map((member) => ({
      ...member,
      initials: getInitials(member.name),
    }))
  );

  const activeMetrics = computed(() => activeConversation.value?.metrics ?? []);
  const activeSignalBars = computed(() => activeConversation.value?.signalBars ?? []);

  const activeStatusText = computed(() => {
    if (!activeConversation.value) return "";

    return activeConversation.value.status === "Standby"
      ? "Canal en espera, listo para reactivarse."
      : "Canal con actividad estable y espacio para conectar backend.";
  });

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, conversation) => sum + conversation.unread, 0)
  );

  const onlineContacts = computed(() => conversations.value.length);

  const messageCount = computed(() => activeConversation.value?.messages?.length ?? 0);

  function isNearMessagesBottom() {
    const el = messagesContainerRef.value;
    if (!el) return true;

    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return distanceToBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD;
  }

  function scrollMessagesToBottom({ smooth = true } = {}) {
    const el = messagesContainerRef.value;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function onMessagesScroll() {
    if (isNearMessagesBottom()) {
      showScrollToLatest.value = false;
      pendingMessagesBelow.value = 0;
    }
  }

  function jumpToLatestMessages() {
    showScrollToLatest.value = false;
    pendingMessagesBelow.value = 0;
    scrollMessagesToBottom({ smooth: true });
  }

  function selectConversation(conversationId) {
    activeConversationId.value = conversationId;
    subscribeActiveConversation().catch(() => {});

    // Cargar mensajes si no existen
    const conversation =
      conversations.value.find((c) => c.id === conversationId) ||
      dms.value.find((d) => d.id === conversationId);
    if (conversation && (!conversation.messages || conversation.messages.length === 0)) {
      loadConversationMessages(conversationId);
    }
  }

  async function loadConversationMessages(conversationId) {
    try {
      const messagesResponse = await chatService.getMessages(conversationId, 50);
      const serverMessages = messagesResponse?.data?.messages ?? [];

      const conversation =
        conversations.value.find((c) => c.id === conversationId) ||
        dms.value.find((d) => d.id === conversationId);

      if (conversation) {
        conversation.messages = serverMessages.map((message) =>
          formatServerMessage({
            id: message.id,
            senderId: message.sender_id,
            senderName: message.sender_name,
            senderUsername: message.sender_username,
            senderAvatarBase64: message.sender_avatar_base64,
            body: message.body,
            createdAt: message.created_at,
            clientMessageId: message.client_message_id,
          })
        );
        conversation.metrics[0].value = String(conversation.messages.length);
        await nextTick();
        scrollMessagesToBottom({ smooth: false });
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error);
    }
  }

  function formatServerMessage(message) {
    const isOwn = message.senderId === currentUser.value.id;
    const displayName = message.senderName || message.senderUsername || "Usuario";
    return {
      id: message.id,
      author: isOwn ? "Tu" : displayName,
      role: isOwn ? "operator" : "member",
      text: message.body,
      time: timeLabelFromDate(message.createdAt),
      own: isOwn,
      avatarBase64: message.senderAvatarBase64 || message.sender_avatar_base64 || null,
      senderId: message.senderId,
      senderName: message.senderName || null,
      senderUsername: message.senderUsername || null,
      createdAt: message.createdAt,
      clientMessageId: message.clientMessageId || null,
    };
  }

  function pushOrUpdateMessage(conversation, incoming) {
    if (!conversation) {
      return;
    }

    const existingById = conversation.messages.find((message) => message.id === incoming.id);
    if (existingById) {
      existingById.author = incoming.author;
      existingById.text = incoming.text;
      existingById.time = incoming.time;
      existingById.avatarBase64 = incoming.avatarBase64 || existingById.avatarBase64 || null;
      return;
    }

    if (incoming.clientMessageId) {
      const existingByClientId = conversation.messages.find(
        (message) => message.clientMessageId && message.clientMessageId === incoming.clientMessageId
      );
      if (existingByClientId) {
        existingByClientId.id = incoming.id;
        existingByClientId.author = incoming.author;
        existingByClientId.text = incoming.text;
        existingByClientId.time = incoming.time;
        existingByClientId.createdAt = incoming.createdAt;
        existingByClientId.avatarBase64 =
          incoming.avatarBase64 || existingByClientId.avatarBase64 || null;
        return;
      }
    }

    conversation.messages.push(incoming);
  }

  async function loadGlobalChat() {
    loadingChat.value = true;
    chatError.value = "";

    try {
      const chatResponse = await chatService.getGlobalChat();
      const chat = chatResponse?.data?.chat;

      if (!chat?.id) {
        throw new Error("No se encontro chat global");
      }

      const conversation = createDefaultConversation(chat);
      const messagesResponse = await chatService.getMessages(chat.id, 50);
      const serverMessages = messagesResponse?.data?.messages ?? [];

      conversation.messages = serverMessages.map((message) =>
        formatServerMessage({
          id: message.id,
          senderId: message.sender_id,
          senderName: message.sender_name,
          senderUsername: message.sender_username,
          senderAvatarBase64: message.sender_avatar_base64,
          body: message.body,
          createdAt: message.created_at,
          clientMessageId: message.client_message_id,
        })
      );

      conversation.metrics[0].value = String(conversation.messages.length);
      conversations.value = [conversation];
      activeConversationId.value = conversation.id;
      await nextTick();
      scrollMessagesToBottom({ smooth: false });
    } catch (error) {
      chatError.value =
        error?.response?.data?.error || error.message || "No fue posible cargar el chat.";
      conversations.value = [];
      activeConversationId.value = "";
    } finally {
      loadingChat.value = false;
    }
  }

  async function loadDMs() {
    loadingDMs.value = true;

    try {
      const dmsResponse = await chatService.getDMs();
      const dmList = dmsResponse?.data?.dms ?? [];

      dms.value = dmList.map((dm) => createDMConversation(dm, dm.friend_name, dm.friend_username));
    } catch (error) {
      // Silenciosamente fallar en cargar DMs no debería romper la app
      console.error("Error loading DMs:", error);
      dms.value = [];
    } finally {
      loadingDMs.value = false;
    }
  }

  async function openDMWithFriend(friendId, friendName, friendUsername) {
    chatError.value = "";

    try {
      const response = await chatService.openDMWithFriend(friendId);
      const chat = response?.data?.chat;

      if (!chat?.id) {
        throw new Error("No se pudo abrir el DM");
      }

      let conversation = dms.value.find((dm) => dm.id === chat.id);
      if (!conversation) {
        const dmConversation = createDMConversation(chat, friendName, friendUsername);
        dms.value.push(dmConversation);
        conversation = dmConversation;
      }

      activeConversationId.value = chat.id;

      // Cargar mensajes del DM
      const messagesResponse = await chatService.getMessages(chat.id, 50);
      const serverMessages = messagesResponse?.data?.messages ?? [];

      if (conversation) {
        conversation.messages = serverMessages.map((message) =>
          formatServerMessage({
            id: message.id,
            senderId: message.sender_id,
            senderName: message.sender_name,
            senderUsername: message.sender_username,
            senderAvatarBase64: message.sender_avatar_base64,
            body: message.body,
            createdAt: message.created_at,
            clientMessageId: message.client_message_id,
          })
        );
        conversation.metrics[0].value = String(conversation.messages.length);
        await nextTick();
        scrollMessagesToBottom({ smooth: false });
      }

      // Suscribir al socket
      await subscribeActiveConversation().catch(() => {});
    } catch (error) {
      chatError.value =
        error?.response?.data?.error || error.message || "No fue posible abrir el DM.";
    }
  }

  async function subscribeActiveConversation() {
    if (!activeConversation.value?.id) {
      return;
    }

    await chatSocketService.subscribeChat(activeConversation.value.id);
  }

  function setupSocketListeners() {
    socketUnsubscribeConnect = chatSocketService.on("connect", () => {
      socketConnected.value = true;
      subscribeActiveConversation().catch(() => {});
    });

    socketUnsubscribeDisconnect = chatSocketService.on("disconnect", () => {
      socketConnected.value = false;
    });

    socketUnsubscribeMessageNew = chatSocketService.on("message:new", (message) => {
      const conversation =
        conversations.value.find((chat) => chat.id === message.chatId) ||
        dms.value.find((dm) => dm.id === message.chatId);
      if (!conversation) {
        return;
      }

      const isActiveChat = activeConversationId.value === message.chatId;
      const shouldStickToBottom = isActiveChat && isNearMessagesBottom();
      const normalized = formatServerMessage(message);
      pushOrUpdateMessage(conversation, normalized);
      conversation.updatedAt = "Ahora";
      conversation.metrics[0].value = String(conversation.messages.length);

      if (!isActiveChat) {
        return;
      }

      nextTick(() => {
        if (shouldStickToBottom || normalized.own) {
          scrollMessagesToBottom({ smooth: true });
          showScrollToLatest.value = false;
          pendingMessagesBelow.value = 0;
          return;
        }

        pendingMessagesBelow.value += 1;
        showScrollToLatest.value = true;
      });
    });
  }

  function cleanupSocketListeners() {
    if (socketUnsubscribeMessageNew) {
      socketUnsubscribeMessageNew();
      socketUnsubscribeMessageNew = null;
    }

    if (socketUnsubscribeConnect) {
      socketUnsubscribeConnect();
      socketUnsubscribeConnect = null;
    }

    if (socketUnsubscribeDisconnect) {
      socketUnsubscribeDisconnect();
      socketUnsubscribeDisconnect = null;
    }
  }

  function normalizeIncomingRequests(payload = []) {
    return payload.map((request) => ({
      id: request.id,
      username: request.requester_username,
      name: request.requester_name || request.requester_username,
      initials: getInitials(request.requester_name || request.requester_username),
    }));
  }

  function normalizeOutgoingRequests(payload = []) {
    return payload.map((request) => ({
      id: request.id,
      username: request.addressee_username,
      name: request.addressee_name || request.addressee_username,
      initials: getInitials(request.addressee_name || request.addressee_username),
    }));
  }

  function normalizeFriends(payload = []) {
    return payload.map((friend) => ({
      user_id: friend.user_id,
      username: friend.username,
      name: friend.name || friend.username,
      initials: getInitials(friend.name || friend.username),
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
      if (!silent) {
        loadingFriendships.value = false;
      }
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

  async function sendMessage() {
    const message = draft.value.trim();
    if (!message || !activeConversation.value) return;

    const clientMessageId = crypto.randomUUID();
    const optimisticMessage = {
      id: `tmp-${clientMessageId}`,
      author: "Tu",
      role: "operator",
      text: message,
      time: nowLabel(),
      own: true,
      avatarBase64: currentUser.value.avatarBase64 || null,
      senderId: currentUser.value.id,
      createdAt: new Date().toISOString(),
      clientMessageId,
    };

    pushOrUpdateMessage(activeConversation.value, optimisticMessage);
    activeConversation.value.updatedAt = "Ahora";
    activeConversation.value.metrics[0].value = String(activeConversation.value.messages.length);
    draft.value = "";
    await nextTick();
    scrollMessagesToBottom({ smooth: true });
    showScrollToLatest.value = false;
    pendingMessagesBelow.value = 0;

    try {
      await chatSocketService.sendMessage({
        chatId: activeConversation.value.id,
        body: message,
        clientMessageId,
      });
    } catch (error) {
      chatError.value = error.message || "No fue posible enviar el mensaje.";
    }
  }

  function openProfileModal() {
    profileError.value = "";
    profileSuccess.value = "";
    profileName.value = currentUser.value.name || "";
    profileUsername.value = currentUser.value.username || "";
    profileBio.value = currentUser.value.bio || "";
    profileAvatarBase64.value = null;
    profileAvatarMode.value = "unchanged";
    profileModalOpen.value = true;
  }

  function closeProfileModal() {
    profileModalOpen.value = false;
    profileError.value = "";
    profileSuccess.value = "";
    profileAvatarBase64.value = null;
    profileAvatarMode.value = "unchanged";
  }

  async function handleAvatarInput(event) {
    profileError.value = "";
    const [file] = event?.target?.files || [];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      profileError.value = "Selecciona un archivo de imagen valido.";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      profileError.value = "La imagen no debe superar 2MB.";
      return;
    }

    const result = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No fue posible leer la imagen."));
      reader.readAsDataURL(file);
    });

    if (typeof result !== "string" || !result.includes(",")) {
      profileError.value = "No fue posible procesar la imagen.";
      return;
    }

    profileAvatarBase64.value = result.split(",")[1] || null;
    profileAvatarMode.value = "updated";
  }

  function removeAvatarFromProfile() {
    profileError.value = "";
    profileAvatarBase64.value = null;
    profileAvatarMode.value = "removed";
  }

  async function saveProfileChanges() {
    profileError.value = "";
    profileSuccess.value = "";
    savingProfile.value = true;

    const payload = {};
    const nextName = profileName.value.trim();
    const nextUsername = profileUsername.value.trim().toLowerCase();
    const nextBio = profileBio.value.trim() || null;

    if (nextName && nextName !== (currentUser.value.name || "")) {
      payload.name = nextName;
    }

    if (nextUsername && nextUsername !== (currentUser.value.username || "")) {
      payload.username = nextUsername;
    }

    if (nextBio !== (currentUser.value.bio || null)) {
      payload.bio = nextBio;
    }

    if (profileAvatarMode.value === "updated") {
      payload.avatarBase64 = profileAvatarBase64.value;
    } else if (profileAvatarMode.value === "removed") {
      payload.avatarBase64 = null;
    }

    if (!Object.keys(payload).length) {
      savingProfile.value = false;
      profileError.value = "No hay cambios para guardar.";
      return;
    }

    const response = await authStore.updateProfile(payload);
    savingProfile.value = false;

    if (!response.ok) {
      profileError.value = response.error || "No fue posible guardar el perfil.";
      return;
    }

    profileSuccess.value = "Perfil actualizado.";
    profileModalOpen.value = false;
  }

  async function handleLogout() {
    const ok = await authStore.logout();

    if (ok) {
      router.push("/login");
    }
  }

  onMounted(async () => {
    await loadGlobalChat();
    await loadDMs();
    chatSocketService.connect();
    setupSocketListeners();
    await subscribeActiveConversation().catch((error) => {
      chatError.value = error.message || "No fue posible suscribirse al chat.";
    });
    loadFriendships();
    startFriendshipsRefreshLoop();
    window.addEventListener("focus", refreshFriendshipsInBackground);
    document.addEventListener("visibilitychange", refreshFriendshipsInBackground);
    await nextTick();
    scrollMessagesToBottom({ smooth: false });
  });

  onBeforeUnmount(() => {
    cleanupSocketListeners();
    if (activeConversation.value?.id) {
      chatSocketService.unsubscribeChat(activeConversation.value.id).catch(() => {});
    }
    chatSocketService.disconnect();
    stopFriendshipsRefreshLoop();
    window.removeEventListener("focus", refreshFriendshipsInBackground);
    document.removeEventListener("visibilitychange", refreshFriendshipsInBackground);
  });

  return {
    activeConversation,
    activeConversationId,
    activeMessages,
    activeMetrics,
    activeRoster,
    activeSignalBars,
    activeStatusText,
    conversations,
    currentUser,
    dms,
    draft,
    friendPanelTab,
    friends,
    friendshipError,
    chatError,
    loadingChat,
    loadingDMs,
    socketConnected,
    handleLogout,
    incomingFriendRequests,
    loadingFriendships,
    loadingAuth,
    messageCount,
    onlineContacts,
    onMessagesScroll,
    outgoingFriendRequests,
    openProfileModal,
    pendingFriendActionId,
    profileAvatarPreview,
    profileBio,
    profileError,
    profileModalOpen,
    profileName,
    profileSuccess,
    profileUsername,
    removingFriendId,
    removeAvatarFromProfile,
    requestUsername,
    removeFriend,
    respondToFriendRequest,
    saveProfileChanges,
    savingProfile,
    showScrollToLatest,
    pendingMessagesBelow,
    selectConversation,
    sendFriendRequest,
    sendMessage,
    sendingFriendRequest,
    setFriendPanelTab,
    handleAvatarInput,
    totalUnread,
    openDMWithFriend,
    loadDMs,
    closeProfileModal,
    messagesContainerRef,
    jumpToLatestMessages,
  };
}
