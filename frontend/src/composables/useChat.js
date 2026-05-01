import { computed, nextTick, ref, watch } from "vue";
import { authService } from "../services/authService";
import { chatService } from "../services/chatService";
import { chatSocketService } from "../services/chatSocketService";

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
    avatarBase64: dm.friend_avatar_base64 || null,
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
  if (!value) return nowLabel();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowLabel();
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

export function useChat({ currentUser }) {
  const conversations = ref([]);
  const dms = ref([]);
  const activeConversationId = ref("");
  const draft = ref("");
  const loadingChat = ref(false);
  const loadingDMs = ref(false);
  const chatError = ref("");
  const socketConnected = ref(false);
  const messagesContainerRef = ref(null);
  const showScrollToLatest = ref(false);
  const pendingMessagesBelow = ref(0);
  const editingMessageId = ref("");
  const editingMessageText = ref("");
  const deletingMessageId = ref("");
  const userPopover = ref({
    visible: false,
    user: null,
    x: 0,
    y: 0,
    loading: false,
    error: "",
    isAdmin: false,
  });
  const timedOutUntil = ref(null);
  const timeoutNowMs = ref(Date.now());

  let socketUnsubscribeMessageNew = null;
  let socketUnsubscribeMessageUpdated = null;
  let socketUnsubscribeMessageDeleted = null;
  let socketUnsubscribeAccountTimeout = null;
  let socketUnsubscribeAccountTimeoutCleared = null;
  let socketUnsubscribeConnect = null;
  let socketUnsubscribeDisconnect = null;
  let timeoutTickIntervalId = null;
  let userPopoverRequestId = 0;

  watch(
    () => currentUser.value?.timedOutUntil,
    (value) => {
      timedOutUntil.value = value || null;
    },
    { immediate: true }
  );

  const activeConversation = computed(
    () =>
      conversations.value.find((c) => c.id === activeConversationId.value) ??
      dms.value.find((d) => d.id === activeConversationId.value) ??
      null
  );

  const activeMessages = computed(() =>
    (activeConversation.value?.messages ?? []).map((message) => ({
      ...message,
      initials: getInitials(message.author),
    }))
  );
  const isCurrentUserAdmin = computed(() => currentUser.value?.role === "admin");

  const activeMetrics = computed(() => activeConversation.value?.metrics ?? []);
  const activeSignalBars = computed(() => activeConversation.value?.signalBars ?? []);
  const activeStatusText = computed(() => {
    if (!activeConversation.value) return "";
    return activeConversation.value.status === "Standby"
      ? "Canal en espera, listo para reactivarse."
      : "Canal con actividad estable y espacio para conectar backend.";
  });
  const totalUnread = computed(() => conversations.value.reduce((sum, c) => sum + c.unread, 0));
  const onlineContacts = computed(() => conversations.value.length);
  const messageCount = computed(() => activeConversation.value?.messages?.length ?? 0);
  const isUserTimedOut = computed(() => {
    if (!timedOutUntil.value) return false;
    const untilMs = new Date(timedOutUntil.value).getTime();
    if (Number.isNaN(untilMs)) return false;
    return untilMs > timeoutNowMs.value;
  });
  const timeoutRemainingLabel = computed(() => {
    if (!isUserTimedOut.value) return "";
    const untilMs = new Date(timedOutUntil.value).getTime();
    const remainingMs = Math.max(0, untilMs - timeoutNowMs.value);
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  });

  // ── Scroll ────────────────────────────────────────────────────────────────

  function isNearMessagesBottom() {
    const el = messagesContainerRef.value;
    if (!el) return true;
    return el.scrollHeight - (el.scrollTop + el.clientHeight) <= AUTO_SCROLL_BOTTOM_THRESHOLD;
  }

  function scrollMessagesToBottom({ smooth = true } = {}) {
    const el = messagesContainerRef.value;
    if (!el) return;

    if (!smooth) {
      el.scrollTop = el.scrollHeight;
      return;
    }

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function bindMessagesContainerRef(el) {
    messagesContainerRef.value = el || null;
  }

  function getConversationById(conversationId) {
    return (
      conversations.value.find((c) => c.id === conversationId) ||
      dms.value.find((d) => d.id === conversationId) ||
      null
    );
  }

  function updateConversationMetrics(conversation) {
    if (!conversation?.metrics?.length) return;
    conversation.metrics[0].value = String(conversation.messages.length);
  }

  function getUserProfileFromCurrentUser() {
    return {
      id: currentUser.value?.id || null,
      name: currentUser.value?.name || currentUser.value?.username || "Usuario",
      username: currentUser.value?.username || "",
      bio: currentUser.value?.bio || "",
      avatarBase64: currentUser.value?.avatarBase64 || null,
      role: currentUser.value?.role || null,
      bannedAt: currentUser.value?.bannedAt || null,
      timedOutUntil: currentUser.value?.timedOutUntil || null,
    };
  }

  function normalizeUserProfile(user, fallback = {}) {
    return {
      id: user.id || fallback.id || null,
      name: user.name || fallback.name || user.username || "Usuario",
      username: user.username || fallback.username || "",
      bio: user.bio ?? fallback.bio ?? "",
      avatarBase64: user.avatarBase64 || fallback.avatarBase64 || null,
      role: user.role || fallback.role || null,
      bannedAt: user.bannedAt || fallback.bannedAt || null,
      timedOutUntil: user.timedOutUntil || fallback.timedOutUntil || null,
    };
  }

  function clearMessageEditingState() {
    editingMessageId.value = "";
    editingMessageText.value = "";
  }

  function clearDeleteMessageState() {
    deletingMessageId.value = "";
  }

  function closeUserPopover() {
    userPopoverRequestId += 1;
    userPopover.value.visible = false;
    userPopover.value.loading = false;
    userPopover.value.error = "";
  }

  function openUserPopover({ message, event }) {
    if (!message) return;

    const fallbackUser =
      message.senderId === currentUser.value?.id
        ? getUserProfileFromCurrentUser()
        : normalizeUserProfile({
            id: message.senderId,
            name: message.senderName,
            username: message.senderUsername,
            bio: message.senderBio || "",
            avatarBase64: message.avatarBase64,
          });

    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const popoverWidth = 320;
    const popoverHeight = isCurrentUserAdmin.value ? 420 : 300;
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 720;
    let x = rect ? rect.left : Math.round(viewportWidth / 2 - popoverWidth / 2);
    let y = rect ? rect.bottom + 10 : Math.round(viewportHeight / 2 - popoverHeight / 2);

    if (x + popoverWidth > viewportWidth - 16) {
      x = viewportWidth - popoverWidth - 16;
    }

    if (y + popoverHeight > viewportHeight - 16) {
      y = rect ? Math.max(16, rect.top - popoverHeight - 10) : viewportHeight - popoverHeight - 16;
    }

    x = Math.max(16, x);
    y = Math.max(16, y);

    userPopover.value = {
      visible: true,
      user: fallbackUser,
      x,
      y,
      loading: Boolean(
        isCurrentUserAdmin.value && message.senderId && message.senderId !== currentUser.value?.id
      ),
      error: "",
      isAdmin: Boolean(isCurrentUserAdmin.value),
    };

    if (
      !isCurrentUserAdmin.value ||
      !message.senderId ||
      message.senderId === currentUser.value?.id
    ) {
      return;
    }

    const requestId = ++userPopoverRequestId;
    authService
      .getAdminUser(message.senderId)
      .then((response) => {
        if (!userPopover.value.visible || requestId !== userPopoverRequestId) {
          return;
        }

        userPopover.value.user = normalizeUserProfile(response?.data?.user ?? {}, fallbackUser);
      })
      .catch((error) => {
        if (requestId !== userPopoverRequestId) {
          return;
        }

        userPopover.value.error =
          error?.response?.data?.error || error.message || "No fue posible cargar la información.";
      })
      .finally(() => {
        if (requestId === userPopoverRequestId) {
          userPopover.value.loading = false;
        }
      });
  }

  function startEditingMessage(message) {
    if (!message || message.senderId !== currentUser.value?.id) {
      return;
    }

    clearDeleteMessageState();
    editingMessageId.value = message.id;
    editingMessageText.value = message.text;
  }

  function removeMessageFromConversation(conversation, messageId) {
    if (!conversation) return;

    const index = conversation.messages.findIndex((item) => item.id === messageId);
    if (index >= 0) {
      conversation.messages.splice(index, 1);
      updateConversationMetrics(conversation);
    }
  }

  async function saveEditingMessage(message) {
    const messageId = message?.id || editingMessageId.value;
    const body = editingMessageText.value.trim();

    if (!messageId || !body) {
      return;
    }

    try {
      const updated = await chatSocketService.editMessage({ messageId, body });
      const conversation = activeConversation.value;
      if (conversation) {
        pushOrUpdateMessage(conversation, formatServerMessage(updated));
        conversation.updatedAt = "Ahora";
        updateConversationMetrics(conversation);
      }
      clearMessageEditingState();
    } catch (error) {
      chatError.value = error.message || "No fue posible editar el mensaje.";
    }
  }

  function deleteMessage(message) {
    if (!message?.id) return;

    const canDeleteOwn = message.senderId === currentUser.value?.id;
    const canDeleteAsAdmin =
      isCurrentUserAdmin.value && activeConversation.value?.type === "channel";

    if (!canDeleteOwn && !canDeleteAsAdmin) {
      return;
    }

    if (deletingMessageId.value === message.id) {
      deletingMessageId.value = "";
      return;
    }

    deletingMessageId.value = message.id;
  }

  async function confirmDeleteMessage(message) {
    if (!message?.id) return;

    const canDeleteOwn = message.senderId === currentUser.value?.id;
    const canDeleteAsAdmin =
      isCurrentUserAdmin.value && activeConversation.value?.type === "channel";

    if (!canDeleteOwn && !canDeleteAsAdmin) {
      return;
    }

    try {
      const removed = await chatSocketService.deleteMessage({ messageId: message.id });
      const conversation = activeConversation.value;
      if (conversation) {
        removeMessageFromConversation(conversation, message.id);
        conversation.updatedAt = "Ahora";
        updateConversationMetrics(conversation);
      }

      if (editingMessageId.value === message.id) {
        clearMessageEditingState();
      }

      clearDeleteMessageState();

      if (removed?.deletedAt) {
        closeUserPopover();
      }
    } catch (error) {
      chatError.value = error.message || "No fue posible eliminar el mensaje.";
    }
  }

  function cancelDeleteMessage() {
    clearDeleteMessageState();
  }

  async function timeoutUserFromPopover({ minutes, reason }) {
    const userId = userPopover.value.user?.id;
    if (!userId) return;

    try {
      await authService.timeoutUser(userId, minutes, reason);
      closeUserPopover();
    } catch (error) {
      userPopover.value.error =
        error?.response?.data?.error || error.message || "No fue posible aplicar timeout.";
    }
  }

  async function banUserFromPopover({ reason }) {
    const userId = userPopover.value.user?.id;
    if (!userId) return;

    try {
      await authService.banUser(userId, reason);
      closeUserPopover();
    } catch (error) {
      userPopover.value.error =
        error?.response?.data?.error || error.message || "No fue posible aplicar ban.";
    }
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

  // ── Mensajes ──────────────────────────────────────────────────────────────

  function formatServerMessage(message) {
    const isOwn = message.senderId === currentUser.value?.id;
    const displayName = message.senderName || message.senderUsername || "Usuario";
    const displayUsername = message.senderUsername || "";
    return {
      id: message.id,
      author: displayName,
      role: isOwn ? "operator" : "member",
      text: message.body,
      time: timeLabelFromDate(message.createdAt),
      own: isOwn,
      avatarBase64: message.senderAvatarBase64 || message.sender_avatar_base64 || null,
      senderId: message.senderId,
      senderName: message.senderName || null,
      senderUsername: message.senderUsername || null,
      senderBio: message.senderBio || message.sender_bio || null,
      username: displayUsername,
      createdAt: message.createdAt,
      editedAt: message.editedAt || null,
      deletedAt: message.deletedAt || null,
      clientMessageId: message.clientMessageId || null,
    };
  }

  function pushOrUpdateMessage(conversation, incoming) {
    if (!conversation) return;

    if (incoming.deletedAt) {
      removeMessageFromConversation(conversation, incoming.id);
      return;
    }

    const existingById = conversation.messages.find((m) => m.id === incoming.id);
    if (existingById) {
      existingById.author = incoming.author;
      existingById.text = incoming.text;
      existingById.time = incoming.time;
      existingById.avatarBase64 = incoming.avatarBase64 || existingById.avatarBase64 || null;
      existingById.username = incoming.username || existingById.username || "";
      existingById.senderBio = incoming.senderBio || existingById.senderBio || null;
      existingById.editedAt = incoming.editedAt || existingById.editedAt || null;
      existingById.deletedAt = incoming.deletedAt || null;
      return;
    }

    if (incoming.clientMessageId) {
      const existingByClientId = conversation.messages.find(
        (m) => m.clientMessageId && m.clientMessageId === incoming.clientMessageId
      );
      if (existingByClientId) {
        existingByClientId.id = incoming.id;
        existingByClientId.author = incoming.author;
        existingByClientId.text = incoming.text;
        existingByClientId.time = incoming.time;
        existingByClientId.createdAt = incoming.createdAt;
        existingByClientId.avatarBase64 =
          incoming.avatarBase64 || existingByClientId.avatarBase64 || null;
        existingByClientId.username = incoming.username || existingByClientId.username || "";
        existingByClientId.senderBio = incoming.senderBio || existingByClientId.senderBio || null;
        existingByClientId.editedAt = incoming.editedAt || existingByClientId.editedAt || null;
        return;
      }
    }

    conversation.messages.push(incoming);
    updateConversationMetrics(conversation);
  }

  function mapServerMessages(serverMessages) {
    return serverMessages.map((message) =>
      formatServerMessage({
        id: message.id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderUsername: message.sender_username,
        senderBio: message.sender_bio,
        senderAvatarBase64: message.sender_avatar_base64,
        body: message.body,
        createdAt: message.created_at,
        editedAt: message.edited_at,
        deletedAt: message.deleted_at,
        clientMessageId: message.client_message_id,
      })
    );
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  async function loadConversationMessages(conversationId) {
    try {
      const messagesResponse = await chatService.getMessages(conversationId, 50);
      const serverMessages = messagesResponse?.data?.messages ?? [];
      const conversation =
        conversations.value.find((c) => c.id === conversationId) ||
        dms.value.find((d) => d.id === conversationId);

      if (conversation) {
        conversation.messages = mapServerMessages(serverMessages);
        updateConversationMetrics(conversation);
        await nextTick();
        scrollMessagesToBottom({ smooth: false });
        showScrollToLatest.value = false;
        pendingMessagesBelow.value = 0;
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error);
    }
  }

  async function loadGlobalChat() {
    loadingChat.value = true;
    chatError.value = "";

    try {
      const chatResponse = await chatService.getGlobalChat();
      const chat = chatResponse?.data?.chat;
      if (!chat?.id) throw new Error("No se encontro chat global");

      const conversation = createDefaultConversation(chat);
      const messagesResponse = await chatService.getMessages(chat.id, 50);
      const serverMessages = messagesResponse?.data?.messages ?? [];

      conversation.messages = mapServerMessages(serverMessages);
      updateConversationMetrics(conversation);
      conversations.value = [conversation];
      activeConversationId.value = conversation.id;
      await nextTick();
      scrollMessagesToBottom({ smooth: false });
      showScrollToLatest.value = false;
      pendingMessagesBelow.value = 0;
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
      console.error("Error loading DMs:", error);
      dms.value = [];
    } finally {
      loadingDMs.value = false;
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  function selectConversation(conversationId) {
    closeUserPopover();
    clearMessageEditingState();
    clearDeleteMessageState();
    activeConversationId.value = conversationId;
    subscribeActiveConversation().catch(() => {});
    const conversation =
      conversations.value.find((c) => c.id === conversationId) ||
      dms.value.find((d) => d.id === conversationId);
    if (conversation && (!conversation.messages || conversation.messages.length === 0)) {
      loadConversationMessages(conversationId);
    } else if (conversation) {
      nextTick(() => {
        scrollMessagesToBottom({ smooth: false });
      });
    }
  }

  async function openDMWithFriend(friendId, friendName, friendUsername) {
    chatError.value = "";
    closeUserPopover();
    clearMessageEditingState();
    clearDeleteMessageState();
    try {
      const response = await chatService.openDMWithFriend(friendId);
      const chat = response?.data?.chat;
      if (!chat?.id) throw new Error("No se pudo abrir el DM");

      let conversation = dms.value.find((dm) => dm.id === chat.id);
      if (!conversation) {
        const dmConversation = createDMConversation(chat, friendName, friendUsername);
        dms.value.push(dmConversation);
        conversation = dmConversation;
      }

      activeConversationId.value = chat.id;

      const messagesResponse = await chatService.getMessages(chat.id, 50);
      const serverMessages = messagesResponse?.data?.messages ?? [];

      if (conversation) {
        conversation.messages = mapServerMessages(serverMessages);
        updateConversationMetrics(conversation);
        await nextTick();
        scrollMessagesToBottom({ smooth: false });
        showScrollToLatest.value = false;
        pendingMessagesBelow.value = 0;
      }

      await subscribeActiveConversation().catch(() => {});
    } catch (error) {
      chatError.value =
        error?.response?.data?.error || error.message || "No fue posible abrir el DM.";
    }
  }

  async function sendMessage() {
    if (isUserTimedOut.value) {
      chatError.value = timeoutRemainingLabel.value
        ? `No puedes enviar mensajes por timeout (${timeoutRemainingLabel.value}).`
        : "No puedes enviar mensajes por timeout.";
      return;
    }

    const message = draft.value.trim();
    if (!message || !activeConversation.value) return;

    const shouldStickToBottom = isNearMessagesBottom();
    const currentUserId = currentUser.value?.id;

    const clientMessageId = crypto.randomUUID();
    const optimisticMessage = {
      id: `tmp-${clientMessageId}`,
      author: currentUser.value?.name || currentUser.value?.username || "Usuario",
      role: "operator",
      text: message,
      time: nowLabel(),
      own: true,
      avatarBase64: currentUser.value?.avatarBase64 || null,
      senderId: currentUserId,
      senderName: currentUser.value?.name || null,
      senderUsername: currentUser.value?.username || null,
      senderBio: currentUser.value?.bio || null,
      username: currentUser.value?.username || "",
      createdAt: new Date().toISOString(),
      clientMessageId,
    };

    pushOrUpdateMessage(activeConversation.value, optimisticMessage);
    activeConversation.value.updatedAt = "Ahora";
    updateConversationMetrics(activeConversation.value);
    draft.value = "";
    await nextTick();

    if (shouldStickToBottom) {
      scrollMessagesToBottom({ smooth: true });
      showScrollToLatest.value = false;
      pendingMessagesBelow.value = 0;
    } else {
      pendingMessagesBelow.value += 1;
      showScrollToLatest.value = true;
    }

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

  // ── Socket ────────────────────────────────────────────────────────────────

  async function subscribeActiveConversation() {
    if (!activeConversation.value?.id) return;
    await chatSocketService.subscribeChat(activeConversation.value.id);
  }

  function setupSocketListeners() {
    if (!timeoutTickIntervalId) {
      timeoutTickIntervalId = window.setInterval(() => {
        timeoutNowMs.value = Date.now();
      }, 1000);
    }

    socketUnsubscribeConnect = chatSocketService.on("connect", () => {
      socketConnected.value = true;
      subscribeActiveConversation().catch(() => {});
    });

    socketUnsubscribeDisconnect = chatSocketService.on("disconnect", () => {
      socketConnected.value = false;
    });

    socketUnsubscribeMessageNew = chatSocketService.on("message:new", (message) => {
      const conversation = getConversationById(message.chatId);
      if (!conversation) return;

      const isActiveChat = activeConversationId.value === message.chatId;
      const shouldStickToBottom = isActiveChat && isNearMessagesBottom();
      const normalized = formatServerMessage(message);
      const isAckForOptimisticMessage = Boolean(
        normalized.clientMessageId &&
        conversation.messages.some((item) => item.clientMessageId === normalized.clientMessageId)
      );
      pushOrUpdateMessage(conversation, normalized);
      conversation.updatedAt = "Ahora";
      updateConversationMetrics(conversation);

      if (!isActiveChat) return;

      if (isAckForOptimisticMessage) {
        return;
      }

      nextTick(() => {
        if (shouldStickToBottom) {
          scrollMessagesToBottom({ smooth: true });
          showScrollToLatest.value = false;
          pendingMessagesBelow.value = 0;
          return;
        }
        pendingMessagesBelow.value += 1;
        showScrollToLatest.value = true;
      });
    });

    socketUnsubscribeMessageUpdated = chatSocketService.on("message:updated", (message) => {
      const conversation = getConversationById(message.chatId);
      if (!conversation) return;

      pushOrUpdateMessage(conversation, formatServerMessage(message));
      conversation.updatedAt = "Ahora";
      updateConversationMetrics(conversation);

      if (editingMessageId.value === message.id) {
        clearMessageEditingState();
      }

      if (deletingMessageId.value === message.id) {
        clearDeleteMessageState();
      }
    });

    socketUnsubscribeMessageDeleted = chatSocketService.on("message:deleted", (message) => {
      const conversation = getConversationById(message.chatId);
      if (!conversation) return;

      removeMessageFromConversation(conversation, message.id);
      conversation.updatedAt = "Ahora";
      updateConversationMetrics(conversation);

      if (editingMessageId.value === message.id) {
        clearMessageEditingState();
      }

      if (deletingMessageId.value === message.id) {
        clearDeleteMessageState();
      }
    });

    socketUnsubscribeAccountTimeout = chatSocketService.on("account:timeout", (payload = {}) => {
      timedOutUntil.value = payload.timedOutUntil || timedOutUntil.value;
      timeoutNowMs.value = Date.now();
    });

    socketUnsubscribeAccountTimeoutCleared = chatSocketService.on("account:timeout-cleared", () => {
      timedOutUntil.value = null;
      timeoutNowMs.value = Date.now();
    });
  }

  function cleanupSocketListeners() {
    socketUnsubscribeMessageNew?.();
    socketUnsubscribeMessageNew = null;
    socketUnsubscribeMessageUpdated?.();
    socketUnsubscribeMessageUpdated = null;
    socketUnsubscribeMessageDeleted?.();
    socketUnsubscribeMessageDeleted = null;
    socketUnsubscribeAccountTimeout?.();
    socketUnsubscribeAccountTimeout = null;
    socketUnsubscribeAccountTimeoutCleared?.();
    socketUnsubscribeAccountTimeoutCleared = null;
    socketUnsubscribeConnect?.();
    socketUnsubscribeConnect = null;
    socketUnsubscribeDisconnect?.();
    socketUnsubscribeDisconnect = null;

    if (timeoutTickIntervalId) {
      window.clearInterval(timeoutTickIntervalId);
      timeoutTickIntervalId = null;
    }
  }

  // ── Limpiar DM ────────────────────────────────────────────────────────────

  const clearingDM = ref(false);

  async function clearDM(chatId) {
    if (clearingDM.value) return;
    clearingDM.value = true;
    chatError.value = "";

    try {
      await chatService.clearDM(chatId);

      // Limpiar mensajes localmente sin tocar la conversación ni el amigo
      const conversation = dms.value.find((d) => d.id === chatId);
      if (conversation) {
        conversation.messages = [];
        updateConversationMetrics(conversation);
        conversation.updatedAt = "Ahora";
      }

      showScrollToLatest.value = false;
      pendingMessagesBelow.value = 0;
      clearMessageEditingState();
      clearDeleteMessageState();
      closeUserPopover();
    } catch (error) {
      chatError.value =
        error?.response?.data?.error || error.message || "No fue posible limpiar el chat.";
    } finally {
      clearingDM.value = false;
    }
  }

  return {
    // state
    activeConversation,
    activeConversationId,
    activeMessages,
    activeMetrics,
    activeSignalBars,
    activeStatusText,
    chatError,
    conversations,
    dms,
    draft,
    editingMessageId,
    editingMessageText,
    deletingMessageId,
    closeUserPopover,
    deleteMessage,
    confirmDeleteMessage,
    cancelDeleteMessage,
    loadingChat,
    loadingDMs,
    messageCount,
    bindMessagesContainerRef,
    messagesContainerRef,
    onlineContacts,
    pendingMessagesBelow,
    openUserPopover,
    isCurrentUserAdmin,
    isUserTimedOut,
    timeoutRemainingLabel,
    saveEditingMessage,
    startEditingMessage,
    timeoutUserFromPopover,
    banUserFromPopover,
    userPopover,
    showScrollToLatest,
    socketConnected,
    totalUnread,
    // actions
    cleanupSocketListeners,
    clearDM,
    clearingDM,
    jumpToLatestMessages,
    loadDMs,
    loadGlobalChat,
    onMessagesScroll,
    openDMWithFriend,
    scrollMessagesToBottom,
    selectConversation,
    sendMessage,
    setupSocketListeners,
    subscribeActiveConversation,
  };
}
