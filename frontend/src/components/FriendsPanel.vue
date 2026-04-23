<script setup>
import FriendItem from "./FriendItem.vue";
import FriendRequest from "./FriendRequest.vue";

defineProps({
  friends: { type: Array, required: true },
  incomingFriendRequests: { type: Array, required: true },
  outgoingFriendRequests: { type: Array, required: true },
  friendPanelTab: { type: String, required: true },
  friendshipError: { type: String, default: "" },
  loadingFriendships: { type: Boolean, default: false },
  pendingFriendActionId: { type: String, default: "" },
  removingFriendId: { type: String, default: "" },
  requestUsername: { type: String, default: "" },
  sendingFriendRequest: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:requestUsername",
  "set-tab",
  "send-friend-request",
  "respond-to-request",
  "remove-friend",
  "open-dm",
]);
</script>

<template>
  <aside class="dv-friends">
    <div class="dv-head">
      <span>Social</span>
      <span>{{
        friendPanelTab === "requests" ? incomingFriendRequests.length : friends.length
      }}</span>
    </div>

    <!-- Tabs -->
    <div class="dv-social-tabs">
      <button
        class="dv-social-tab"
        :class="{ 'is-active': friendPanelTab === 'requests' }"
        type="button"
        @click="emit('set-tab', 'requests')"
      >
        Solicitudes
      </button>
      <button
        class="dv-social-tab"
        :class="{ 'is-active': friendPanelTab === 'friends' }"
        type="button"
        @click="emit('set-tab', 'friends')"
      >
        Amigos
      </button>
    </div>

    <p v-if="friendshipError" class="dv-social-error">{{ friendshipError }}</p>

    <!-- Tab: solicitudes -->
    <template v-if="friendPanelTab === 'requests'">
      <form
        class="dv-friend-form"
        @submit.prevent="emit('send-friend-request')"
      >
        <input
          :value="requestUsername"
          class="dv-friend-input"
          type="text"
          placeholder="username"
          autocomplete="off"
          @input="emit('update:requestUsername', $event.target.value)"
        />
        <button class="dv-friend-send" :disabled="sendingFriendRequest" type="submit">
          {{ sendingFriendRequest ? "Enviando" : "Enviar" }}
        </button>
      </form>

      <div class="dv-social-group">
        <p class="dv-social-subhead">Entrantes</p>
        <FriendRequest
          v-for="request in incomingFriendRequests"
          :key="request.id"
          :request="request"
          :pending-friend-action-id="pendingFriendActionId"
          variant="incoming"
          @accept="emit('respond-to-request', $event, 'accept')"
          @reject="emit('respond-to-request', $event, 'reject')"
        />
        <p v-if="!incomingFriendRequests.length && !loadingFriendships" class="dv-social-empty">
          No tienes solicitudes pendientes.
        </p>
      </div>

      <div class="dv-social-group">
        <p class="dv-social-subhead">Enviadas</p>
        <FriendRequest
          v-for="request in outgoingFriendRequests"
          :key="request.id"
          :request="request"
          variant="outgoing"
        />
        <p v-if="!outgoingFriendRequests.length && !loadingFriendships" class="dv-social-empty">
          No tienes solicitudes enviadas.
        </p>
      </div>
    </template>

    <!-- Tab: amigos -->
    <template v-else>
      <FriendItem
        v-for="friend in friends"
        :key="friend.user_id"
        :friend="friend"
        :removing-friend-id="removingFriendId"
        @open-dm="emit('open-dm', $event)"
        @remove-friend="emit('remove-friend', $event)"
      />
      <p v-if="!friends.length && !loadingFriendships" class="dv-social-empty">
        Aun no tienes amigos agregados.
      </p>
    </template>
  </aside>
</template>
