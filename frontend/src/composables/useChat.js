import { computed, nextTick, ref } from "vue";
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

  let socketUnsubscribeMessageNew = null;
  let socketUnsubscribeConnect = null;
  let socketUnsubscribeDisconnect = null;

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

  const activeMetrics = computed(() => activeConversation.value?.metrics ?? []);
  const activeSignalBars = computed(() => activeConversation.value?.signalBars ?? []);
  const activeStatusText = computed(() => {
    if (!activeConversation.value) return "";
    return activeConversation.value.status === "Standby"
      ? "Canal en espera, listo para reactivarse."
      : "Canal con actividad estable y espacio para conectar backend.";
  });
  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + c.unread, 0)
  );
  const onlineContacts = computed(() => conversations.value.length);
  const messageCount = computed(() => activeConversation.value?.messages?.length ?? 0);

  // ── Scroll ────────────────────────────────────────────────────────────────

  function isNearMessagesBottom() {
    const el = messagesContainerRef.value;
    if (!el) return true;
    return el.scrollHeight - (el.scrollTop + el.clientHeight) <= AUTO_SCROLL_BOTTOM_THRESHOLD;
  }

  function scrollMessagesToBottom({ smooth = true } = {}) {
    const el = messagesContainerRef.value;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
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
    if (!conversation) return;

    const existingById = conversation.messages.find((m) => m.id === incoming.id);
    if (existingById) {
      existingById.author = incoming.author;
      existingById.text = incoming.text;
      existingById.time = incoming.time;
      existingById.avatarBase64 = incoming.avatarBase64 || existingById.avatarBase64 || null;
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
        return;
      }
    }

    conversation.messages.push(incoming);
  }

  function mapServerMessages(serverMessages) {
    return serverMessages.map((message) =>
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
        conversation.metrics[0].value = String(conversation.messages.length);
        await nextTick();
        scrollMessagesToBottom({ smooth: false });
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
      console.error("Error loading DMs:", error);
      dms.value = [];
    } finally {
      loadingDMs.value = false;
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  function selectConversation(conversationId) {
    activeConversationId.value = conversationId;
    subscribeActiveConversation().catch(() => {});
    const conversation =
      conversations.value.find((c) => c.id === conversationId) ||
      dms.value.find((d) => d.id === conversationId);
    if (conversation && (!conversation.messages || conversation.messages.length === 0)) {
      loadConversationMessages(conversationId);
    }
  }

  async function openDMWithFriend(friendId, friendName, friendUsername) {
    chatError.value = "";
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
        conversation.metrics[0].value = String(conversation.messages.length);
        await nextTick();
        scrollMessagesToBottom({ smooth: false });
      }

      await subscribeActiveConversation().catch(() => {});
    } catch (error) {
      chatError.value =
        error?.response?.data?.error || error.message || "No fue posible abrir el DM.";
    }
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

  // ── Socket ────────────────────────────────────────────────────────────────

  async function subscribeActiveConversation() {
    if (!activeConversation.value?.id) return;
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
        conversations.value.find((c) => c.id === message.chatId) ||
        dms.value.find((d) => d.id === message.chatId);
      if (!conversation) return;

      const isActiveChat = activeConversationId.value === message.chatId;
      const shouldStickToBottom = isActiveChat && isNearMessagesBottom();
      const normalized = formatServerMessage(message);
      pushOrUpdateMessage(conversation, normalized);
      conversation.updatedAt = "Ahora";
      conversation.metrics[0].value = String(conversation.messages.length);

      if (!isActiveChat) return;

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
    socketUnsubscribeMessageNew?.();
    socketUnsubscribeMessageNew = null;
    socketUnsubscribeConnect?.();
    socketUnsubscribeConnect = null;
    socketUnsubscribeDisconnect?.();
    socketUnsubscribeDisconnect = null;
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
    loadingChat,
    loadingDMs,
    messageCount,
    messagesContainerRef,
    onlineContacts,
    pendingMessagesBelow,
    showScrollToLatest,
    socketConnected,
    totalUnread,
    // actions
    cleanupSocketListeners,
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