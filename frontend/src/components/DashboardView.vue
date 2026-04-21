<script setup>
import "../assets/css/dashboard-view.css";
import { useDashboardView } from "../composables/useDashboardView";

import Sidebar       from "../components/Sidebar.vue";
import HeroHeader    from "../components/HeroHeader.vue";
import FriendsPanel  from "../components/FriendsPanel.vue";
import ChatPanel     from "../components/ChatPanel.vue";
import ProfileModal  from "../components/ProfileModal.vue";

const {
  // auth
  currentUser,
  loadingAuth,
  handleLogout,

  // conversaciones
  activeConversation,
  activeConversationId,
  conversations,
  dms,
  chatError,
  loadingChat,
  loadingDMs,
  socketConnected,
  selectConversation,
  openDMWithFriend,
  clearDM,
  clearingDM,

  // mensajes
  activeMessages,
  draft,
  messagesContainerRef,
  showScrollToLatest,
  pendingMessagesBelow,
  sendMessage,
  jumpToLatestMessages,
  onMessagesScroll,

  // amistades
  friends,
  friendPanelTab,
  friendshipError,
  incomingFriendRequests,
  outgoingFriendRequests,
  loadingFriendships,
  pendingFriendActionId,
  removingFriendId,
  requestUsername,
  sendingFriendRequest,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  setFriendPanelTab,

  // perfil
  profileModalOpen,
  profileName,
  profileUsername,
  profileBio,
  profileAvatarPreview,
  profileError,
  profileSuccess,
  savingProfile,
  openProfileModal,
  closeProfileModal,
  handleAvatarInput,
  removeAvatarFromProfile,
  saveProfileChanges,
} = useDashboardView();
</script>

<template>
  <main class="dv-shell">

    <!-- Capa 1: Sidebar -->
    <Sidebar
      :current-user="currentUser"
      :conversations="conversations"
      :dms="dms"
      :active-conversation-id="activeConversationId"
      :loading-chat="loadingChat"
      :loading-d-ms="loadingDMs"
      :loading-auth="loadingAuth"
      :chat-error="chatError"
      @select-conversation="selectConversation"
      @open-profile="openProfileModal"
      @logout="handleLogout"
    />

    <!-- Capa 2: Área principal -->
    <section class="dv-main">

      <!-- Capa 3: Header (hero + panel social) -->
      <header class="dv-top">
        <HeroHeader
          :conversation-name="activeConversation?.name || 'Global'"
          :conversation-type="activeConversation?.type || ''"
          :conversation-id="activeConversation?.id || ''"
          :socket-connected="socketConnected"
          :clearing-d-m="clearingDM"
          @clear-dm="clearDM"
        />

        <FriendsPanel
          :friends="friends"
          :incoming-friend-requests="incomingFriendRequests"
          :outgoing-friend-requests="outgoingFriendRequests"
          :friend-panel-tab="friendPanelTab"
          :friendship-error="friendshipError"
          :loading-friendships="loadingFriendships"
          :pending-friend-action-id="pendingFriendActionId"
          :removing-friend-id="removingFriendId"
          :request-username="requestUsername"
          :sending-friend-request="sendingFriendRequest"
          @update:request-username="requestUsername = $event"
          @set-tab="setFriendPanelTab"
          @send-friend-request="sendFriendRequest"
          @respond-to-request="respondToFriendRequest"
          @remove-friend="removeFriend"
          @open-dm="(f) => openDMWithFriend(f.user_id, f.name, f.username)"
        />
      </header>

      <!-- Capa 4: Chat -->
      <ChatPanel
        :messages="activeMessages"
        :draft="draft"
        :messages-container-ref="messagesContainerRef"
        :show-scroll-to-latest="showScrollToLatest"
        :pending-messages-below="pendingMessagesBelow"
        @update:draft="draft = $event"
        @send-message="sendMessage"
        @jump-to-latest="jumpToLatestMessages"
        @messages-scroll="onMessagesScroll"
      />
    </section>

    <!-- Capa 5: Modal de perfil (montada sobre todo) -->
    <ProfileModal
      v-if="profileModalOpen"
      :current-user="currentUser"
      :profile-name="profileName"
      :profile-username="profileUsername"
      :profile-bio="profileBio"
      :profile-avatar-preview="profileAvatarPreview"
      :profile-error="profileError"
      :profile-success="profileSuccess"
      :saving-profile="savingProfile"
      @update:profile-name="profileName = $event"
      @update:profile-username="profileUsername = $event"
      @update:profile-bio="profileBio = $event"
      @avatar-input="handleAvatarInput"
      @remove-avatar="removeAvatarFromProfile"
      @save="saveProfileChanges"
      @close="closeProfileModal"
    />

  </main>
</template>
