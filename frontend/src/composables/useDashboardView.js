import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const conversationSeed = [
  {
    id: "war-room",
    name: "War Room",
    topic: "Operaciones generales, mensajes rapidos y decisiones claras.",
    status: "En linea",
    mode: "jawline protocol",
    members: 12,
    unread: 3,
    updatedAt: "Hace 2 min",
    signalBars: ["0.5rem", "0.9rem", "1.3rem", "1.7rem", "1.2rem"],
    pinnedTitle: "Brief del turno",
    pinnedNote: "Mantener latencia baja, respuestas cortas y canal limpio para cuando entre backend realtime.",
    metrics: [
      { label: "Mensajes hoy", value: "184" },
      { label: "Tiempo medio", value: "1.3s" },
      { label: "Saturacion", value: "18%" },
    ],
    roster: [
      { name: "SigmaOps", role: "Squad lead", online: true },
      { name: "GigaBot", role: "System relay", online: true },
      { name: "Volt", role: "Moderator", online: false },
    ],
    messages: [
      {
        id: "m1",
        author: "SigmaOps",
        role: "squad lead",
        text: "Canal abierto. Usen esto para coordinar, no para adornar.",
        time: "08:14",
        own: false,
      },
      {
        id: "m2",
        author: "GigaBot",
        role: "system",
        text: "Socket mock conectado. La interfaz esta lista para reemplazar seed por payload real.",
        time: "08:16",
        own: false,
      },
      {
        id: "m3",
        author: "Tu",
        role: "operator",
        text: "Recibido. Revisando actividad y preparando el canal para consumo real.",
        time: "08:18",
        own: true,
      },
    ],
  },
  {
    id: "meme-lab",
    name: "Meme Lab",
    topic: "Iteracion visual, copy corto y assets que no se sientan plantilla.",
    status: "Activo",
    mode: "poster drop",
    members: 8,
    unread: 5,
    updatedAt: "Hace 11 min",
    signalBars: ["0.45rem", "0.75rem", "1rem", "1.25rem", "0.85rem"],
    pinnedTitle: "Direccion visual",
    pinnedNote: "Nada de dashboard corporativo. Prioridad en contraste, ritmo y una sola idea fuerte por seccion.",
    metrics: [
      { label: "Conceptos", value: "09" },
      { label: "Assets", value: "27" },
      { label: "Aprobacion", value: "94%" },
    ],
    roster: [
      { name: "FrameCut", role: "Visual editor", online: true },
      { name: "LoreDrop", role: "Copy", online: true },
      { name: "Tu", role: "Operator", online: true },
    ],
    messages: [
      {
        id: "m4",
        author: "FrameCut",
        role: "visual editor",
        text: "El hero del dashboard tiene que sentirse mas poster y menos panel administrativo.",
        time: "09:03",
        own: false,
      },
      {
        id: "m5",
        author: "Tu",
        role: "operator",
        text: "Voy con una cabecera atmosferica, thread dominante y panel lateral mas util.",
        time: "09:05",
        own: true,
      },
    ],
  },
  {
    id: "night-shift",
    name: "Night Shift",
    topic: "Logs, soporte y seguimiento cuando baja el trafico.",
    status: "Standby",
    mode: "silent watch",
    members: 6,
    unread: 0,
    updatedAt: "Ayer",
    signalBars: ["0.3rem", "0.45rem", "0.65rem", "0.9rem", "0.55rem"],
    pinnedTitle: "Ultimo cierre",
    pinnedNote: "Canal de guardia. Si se conecta backend realtime, este es el primero para alertas y eventos de sistema.",
    metrics: [
      { label: "Incidentes", value: "02" },
      { label: "Respuesta", value: "3.8s" },
      { label: "Ruido", value: "Bajo" },
    ],
    roster: [
      { name: "Volt", role: "Moderator", online: false },
      { name: "Nox", role: "Support", online: false },
      { name: "Relay", role: "Bot", online: true },
    ],
    messages: [
      {
        id: "m6",
        author: "Volt",
        role: "moderator",
        text: "Todo limpio por ahora. Solo seguimiento de eventos y cierre suave.",
        time: "23:41",
        own: false,
      },
    ],
  },
];

function nowLabel() {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
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

export function useDashboardView() {
  const router = useRouter();
  const authStore = useAuthStore();
  const { user, loadingAuth } = storeToRefs(authStore);

  const conversations = ref(structuredClone(conversationSeed));
  const activeConversationId = ref(conversations.value[0]?.id ?? "");
  const draft = ref("");

  const currentUser = computed(() => user.value ?? {});

  const activeConversation = computed(
    () =>
      conversations.value.find(
        (conversation) => conversation.id === activeConversationId.value,
      ) ?? conversations.value[0],
  );

  const activeMessages = computed(() =>
    (activeConversation.value?.messages ?? []).map((message) => ({
      ...message,
      initials: getInitials(message.author),
    })),
  );

  const activeRoster = computed(() =>
    (activeConversation.value?.roster ?? []).map((member) => ({
      ...member,
      initials: getInitials(member.name),
    })),
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
    conversations.value.reduce((sum, conversation) => sum + conversation.unread, 0),
  );

  const onlineContacts = computed(() =>
    conversations.value.filter((conversation) => conversation.status !== "Standby").length,
  );

  const messageCount = computed(
    () => activeConversation.value?.messages?.length ?? 0,
  );

  function selectConversation(conversationId) {
    activeConversationId.value = conversationId;
  }

  function sendMessage() {
    const message = draft.value.trim();
    if (!message || !activeConversation.value) return;

    activeConversation.value.messages.push({
      id: `m-${Date.now()}`,
      author: currentUser.value.username ?? "Tu",
      role: "operator",
      text: message,
      time: nowLabel(),
      own: true,
    });

    activeConversation.value.updatedAt = "Ahora";
    draft.value = "";
  }

  async function handleLogout() {
    const ok = await authStore.logout();

    if (ok) {
      router.push("/login");
    }
  }

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
    draft,
    handleLogout,
    loadingAuth,
    messageCount,
    onlineContacts,
    selectConversation,
    sendMessage,
    totalUnread,
  };
}
