import { computed, nextTick, onBeforeUnmount, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { chatSocketService } from "../services/chatSocketService";
import { useChat } from "./useChat";
import { useFriendships } from "./useFriendships";
import { useProfile } from "./useProfile";

export function useDashboardView() {
  const router = useRouter();
  const authStore = useAuthStore();
  const { user, loadingAuth } = storeToRefs(authStore);

  const currentUser = computed(() => user.value ?? {});

  // ── Composables ───────────────────────────────────────────────────────────

  const chat = useChat({ currentUser });
  const friendships = useFriendships();
  const profile = useProfile({ currentUser, authStore });

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function handleLogout() {
    const ok = await authStore.logout();
    if (ok) router.push("/login");
  }

  // ── Roster (amigos como miembros activos) ─────────────────────────────────

  function getInitials(name = "") {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0])
      .join("")
      .toUpperCase();
  }

  const activeRoster = computed(() =>
    friendships.friends.value.map((member) => ({
      ...member,
      initials: getInitials(member.name),
    }))
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  onMounted(async () => {
    await chat.loadGlobalChat();
    await chat.loadDMs();
    chatSocketService.connect();
    chat.setupSocketListeners();
    await chat.subscribeActiveConversation().catch((error) => {
      chat.chatError.value = error.message || "No fue posible suscribirse al chat.";
    });
    friendships.loadFriendships();
    friendships.startFriendshipsRefreshLoop();
    window.addEventListener("focus", friendships.refreshFriendshipsInBackground);
    document.addEventListener("visibilitychange", friendships.refreshFriendshipsInBackground);
    await nextTick();
    chat.scrollMessagesToBottom({ smooth: false });
  });

  onBeforeUnmount(() => {
    chat.cleanupSocketListeners();
    if (chat.activeConversation.value?.id) {
      chatSocketService.unsubscribeChat(chat.activeConversation.value.id).catch(() => {});
    }
    chatSocketService.disconnect();
    friendships.stopFriendshipsRefreshLoop();
    window.removeEventListener("focus", friendships.refreshFriendshipsInBackground);
    document.removeEventListener("visibilitychange", friendships.refreshFriendshipsInBackground);
  });

  // ── Retorno (mismo contrato que el original) ──────────────────────────────

  return {
    // auth
    currentUser,
    loadingAuth,
    handleLogout,

    // chat
    activeConversation: chat.activeConversation,
    activeConversationId: chat.activeConversationId,
    activeMessages: chat.activeMessages,
    activeMetrics: chat.activeMetrics,
    activeSignalBars: chat.activeSignalBars,
    activeStatusText: chat.activeStatusText,
    chatError: chat.chatError,
    conversations: chat.conversations,
    dms: chat.dms,
    draft: chat.draft,
    loadingChat: chat.loadingChat,
    loadingDMs: chat.loadingDMs,
    messageCount: chat.messageCount,
    messagesContainerRef: chat.messagesContainerRef,
    onlineContacts: chat.onlineContacts,
    pendingMessagesBelow: chat.pendingMessagesBelow,
    showScrollToLatest: chat.showScrollToLatest,
    socketConnected: chat.socketConnected,
    totalUnread: chat.totalUnread,
    jumpToLatestMessages: chat.jumpToLatestMessages,
    loadDMs: chat.loadDMs,
    onMessagesScroll: chat.onMessagesScroll,
    openDMWithFriend: chat.openDMWithFriend,
    selectConversation: chat.selectConversation,
    sendMessage: chat.sendMessage,
    clearDM: chat.clearDM,
    clearingDM: chat.clearingDM,

    // friendships
    activeRoster,
    friends: friendships.friends,
    friendPanelTab: friendships.friendPanelTab,
    friendshipError: friendships.friendshipError,
    incomingFriendRequests: friendships.incomingFriendRequests,
    loadingFriendships: friendships.loadingFriendships,
    outgoingFriendRequests: friendships.outgoingFriendRequests,
    pendingFriendActionId: friendships.pendingFriendActionId,
    removingFriendId: friendships.removingFriendId,
    requestUsername: friendships.requestUsername,
    sendingFriendRequest: friendships.sendingFriendRequest,
    removeFriend: friendships.removeFriend,
    respondToFriendRequest: friendships.respondToFriendRequest,
    sendFriendRequest: friendships.sendFriendRequest,
    setFriendPanelTab: friendships.setFriendPanelTab,

    // profile
    closeProfileModal: profile.closeProfileModal,
    handleAvatarInput: profile.handleAvatarInput,
    openProfileModal: profile.openProfileModal,
    profileAvatarPreview: profile.profileAvatarPreview,
    profileBio: profile.profileBio,
    profileError: profile.profileError,
    profileModalOpen: profile.profileModalOpen,
    profileName: profile.profileName,
    profileSuccess: profile.profileSuccess,
    profileUsername: profile.profileUsername,
    removeAvatarFromProfile: profile.removeAvatarFromProfile,
    saveProfileChanges: profile.saveProfileChanges,
    savingProfile: profile.savingProfile,
  };
}