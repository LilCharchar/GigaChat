// composables/useDashboardView.js
// Orquestador: compone todos los composables especializados y re-exporta
// exactamente lo que el template necesita. No contiene lógica propia.

import { useAuth }          from "./useAuth.js";
import { useConversations } from "./useConversations.js";
import { useMessages }      from "./useMessages.js";
import { useFriendships }   from "./useFriendships.js";
import { useProfile }       from "./useProfile.js";

export function useDashboardView() {
  // ── 1. Autenticación ──────────────────────────────────────────────────────
  const {
    currentUser,
    loadingAuth,
    handleLogout,
  } = useAuth();

  // ── 2. Conversaciones (canales + DMs) ─────────────────────────────────────
  const {
    activeConversation,
    activeConversationId,
    chatError,
    conversations,
    dms,
    loadingChat,
    loadingDMs,
    socketConnected,
    openDMWithFriend,
    selectConversation,
  } = useConversations();

  // ── 3. Mensajes ───────────────────────────────────────────────────────────
  const {
    activeMessages,
    draft,
    messagesContainerRef,
    pendingMessagesBelow,
    showScrollToLatest,
    jumpToLatestMessages,
    onMessagesScroll,
    sendMessage,
  } = useMessages({ activeConversationId });

  // ── 4. Amistades ──────────────────────────────────────────────────────────
  const {
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
    removeFriend,
    respondToFriendRequest,
    sendFriendRequest,
    setFriendPanelTab,
  } = useFriendships();

  // ── 5. Perfil ─────────────────────────────────────────────────────────────
  const {
    closeProfileModal,
    handleAvatarInput,
    openProfileModal,
    profileAvatarPreview,
    profileBio,
    profileError,
    profileModalOpen,
    profileName,
    profileSuccess,
    profileUsername,
    removeAvatarFromProfile,
    saveProfileChanges,
    savingProfile,
  } = useProfile({ currentUser });

  // ── Exponer todo al template ───────────────────────────────────────────────
  return {
    // Auth
    currentUser,
    loadingAuth,
    handleLogout,

    // Conversaciones
    activeConversation,
    activeConversationId,
    chatError,
    conversations,
    dms,
    loadingChat,
    loadingDMs,
    socketConnected,
    openDMWithFriend,
    selectConversation,

    // Mensajes
    activeMessages,
    draft,
    messagesContainerRef,
    pendingMessagesBelow,
    showScrollToLatest,
    jumpToLatestMessages,
    onMessagesScroll,
    sendMessage,

    // Amistades
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
    removeFriend,
    respondToFriendRequest,
    sendFriendRequest,
    setFriendPanelTab,

    // Perfil
    closeProfileModal,
    handleAvatarInput,
    openProfileModal,
    profileAvatarPreview,
    profileBio,
    profileError,
    profileModalOpen,
    profileName,
    profileSuccess,
    profileUsername,
    removeAvatarFromProfile,
    saveProfileChanges,
    savingProfile,
  };
}