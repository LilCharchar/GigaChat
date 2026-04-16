<script setup>
import "../assets/css/dashboard-view.css";
import { useDashboardView } from "../composables/useDashboardView";

const {
  activeConversation,
  activeConversationId,
  activeMessages,
  conversations,
  currentUser,
  dms,
  draft,
  friendPanelTab,
  friends,
  friendshipError,
  chatError,
  handleLogout,
  incomingFriendRequests,
  loadingChat,
  loadingDMs,
  loadingFriendships,
  loadingAuth,
  outgoingFriendRequests,
  pendingFriendActionId,
  removingFriendId,
  requestUsername,
  removeFriend,
  respondToFriendRequest,
  socketConnected,
  selectConversation,
  sendFriendRequest,
  sendMessage,
  sendingFriendRequest,
  setFriendPanelTab,
  openDMWithFriend,
} = useDashboardView();
</script>

<template>
  <main class="dv-shell">
    <aside class="dv-sidebar">
      <div class="dv-brand">
        <p class="dv-eyebrow">Gigachat</p>
        <h1>Chadline</h1>
      </div>

      <section class="dv-user">
        <div class="dv-user-mark">
          {{
            (currentUser.name || currentUser.username || currentUser.email || "G")
              .slice(0, 1)
              .toUpperCase()
          }}
        </div>
        <div>
          <strong>{{ currentUser.name || "Operador" }}</strong>
          <p>{{ currentUser.username ? `@${currentUser.username}` : "@sin-username" }}</p>
        </div>
      </section>

      <section class="dv-list-block">
        <div class="dv-head">
          <span>Canales</span>
          <span>{{ conversations.length }}</span>
        </div>

        <p v-if="loadingChat" class="dv-social-empty">Cargando chat global...</p>
        <p v-else-if="chatError" class="dv-social-error">{{ chatError }}</p>

        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          class="dv-room"
          :class="{ 'is-active': conversation.id === activeConversationId }"
          type="button"
          @click="selectConversation(conversation.id)"
        >
          <strong>{{ conversation.name }}</strong>
          <span>{{ conversation.unread || conversation.members }}</span>
        </button>
      </section>

      <section class="dv-list-block">
        <div class="dv-head">
          <span>Mensajes Directos</span>
          <span>{{ dms.length }}</span>
        </div>

        <p v-if="loadingDMs" class="dv-social-empty">Cargando DMs...</p>

        <button
          v-for="dm in dms"
          :key="dm.id"
          class="dv-room"
          :class="{ 'is-active': dm.id === activeConversationId }"
          type="button"
          @click="selectConversation(dm.id)"
        >
          <strong>{{ dm.name }}</strong>
          <span>{{ dm.unread }}</span>
        </button>

        <p v-if="!dms.length && !loadingDMs" class="dv-social-empty">
          No hay DMs. Inicia un chat desde la lista de amigos.
        </p>
      </section>

      <button class="dv-logout" :disabled="loadingAuth" type="button" @click="handleLogout">
        {{ loadingAuth ? "Saliendo..." : "Cerrar sesion" }}
      </button>
    </aside>

    <section class="dv-main">
      <header class="dv-top">
        <div class="dv-hero">
          <div class="dv-hero-copy">
            <p class="dv-eyebrow">Chat</p>
            <h2>{{ activeConversation?.name || "Global" }}</h2>
            <p class="dv-social-empty">
              Socket: {{ socketConnected ? "conectado" : "desconectado" }}
            </p>
          </div>
        </div>

        <aside class="dv-friends">
          <div class="dv-head">
            <span>Social</span>
            <span>{{
              friendPanelTab === "requests" ? incomingFriendRequests.length : friends.length
            }}</span>
          </div>

          <div class="dv-social-tabs">
            <button
              class="dv-social-tab"
              :class="{ 'is-active': friendPanelTab === 'requests' }"
              type="button"
              @click="setFriendPanelTab('requests')"
            >
              Solicitudes
            </button>
            <button
              class="dv-social-tab"
              :class="{ 'is-active': friendPanelTab === 'friends' }"
              type="button"
              @click="setFriendPanelTab('friends')"
            >
              Amigos
            </button>
          </div>

          <p v-if="friendshipError" class="dv-social-error">{{ friendshipError }}</p>

          <template v-if="friendPanelTab === 'requests'">
            <form class="dv-friend-form" @submit.prevent="sendFriendRequest">
              <input
                v-model="requestUsername"
                class="dv-friend-input"
                type="text"
                placeholder="username"
                autocomplete="off"
              />
              <button class="dv-friend-send" :disabled="sendingFriendRequest" type="submit">
                {{ sendingFriendRequest ? "Enviando" : "Enviar" }}
              </button>
            </form>

            <div class="dv-social-group">
              <p class="dv-social-subhead">Entrantes</p>
              <article
                v-for="request in incomingFriendRequests"
                :key="request.id"
                class="dv-friend dv-friend-request"
              >
                <div class="dv-friend-mark">{{ request.initials }}</div>
                <div>
                  <strong>{{ request.name }}</strong>
                  <p>@{{ request.username }}</p>
                </div>
                <div class="dv-request-actions">
                  <button
                    class="dv-request-btn is-accept"
                    :disabled="pendingFriendActionId === request.id"
                    type="button"
                    @click="respondToFriendRequest(request.id, 'accept')"
                  >
                    Aceptar
                  </button>
                  <button
                    class="dv-request-btn is-reject"
                    :disabled="pendingFriendActionId === request.id"
                    type="button"
                    @click="respondToFriendRequest(request.id, 'reject')"
                  >
                    Rechazar
                  </button>
                </div>
              </article>
              <p
                v-if="!incomingFriendRequests.length && !loadingFriendships"
                class="dv-social-empty"
              >
                No tienes solicitudes pendientes.
              </p>
            </div>

            <div class="dv-social-group">
              <p class="dv-social-subhead">Enviadas</p>
              <article
                v-for="request in outgoingFriendRequests"
                :key="request.id"
                class="dv-friend dv-friend-request"
              >
                <div class="dv-friend-mark">{{ request.initials }}</div>
                <div>
                  <strong>{{ request.name }}</strong>
                  <p>@{{ request.username }}</p>
                </div>
                <span class="dv-request-pill">Pendiente</span>
              </article>
              <p
                v-if="!outgoingFriendRequests.length && !loadingFriendships"
                class="dv-social-empty"
              >
                No tienes solicitudes enviadas.
              </p>
            </div>
          </template>

          <template v-else>
            <article v-for="friend in friends" :key="friend.user_id" class="dv-friend">
              <div class="dv-friend-mark">{{ friend.initials }}</div>
              <div>
                <strong>{{ friend.name }}</strong>
                <p>@{{ friend.username }}</p>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button
                  class="dv-request-btn"
                  style="background-color: #4CAF50; color: white;"
                  type="button"
                  @click="openDMWithFriend(friend.user_id, friend.name, friend.username)"
                  title="Enviar mensaje directo"
                >
                  💬
                </button>
                <button
                  class="dv-request-btn is-reject"
                  :disabled="removingFriendId === friend.user_id"
                  type="button"
                  @click="removeFriend(friend.user_id)"
                >
                  {{ removingFriendId === friend.user_id ? "Quitando" : "Eliminar" }}
                </button>
              </div>
            </article>
            <p v-if="!friends.length && !loadingFriendships" class="dv-social-empty">
              Aun no tienes amigos agregados.
            </p>
          </template>
        </aside>
      </header>

      <section class="dv-chat">
        <div class="dv-messages">
          <p v-if="!activeMessages.length" class="dv-social-empty">
            Aun no hay mensajes en este chat.
          </p>
          <article
            v-for="message in activeMessages"
            :key="message.id"
            class="dv-message"
            :class="{ 'is-own': message.own }"
          >
            <div class="dv-message-mark">{{ message.initials }}</div>
            <div class="dv-bubble">
              <strong>{{ message.author }}</strong>
              <p>{{ message.text }}</p>
            </div>
          </article>
        </div>

        <form class="dv-composer" @submit.prevent="sendMessage">
          <textarea
            v-model="draft"
            class="dv-input"
            rows="1"
            placeholder="Escribe un mensaje"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button class="dv-send" type="submit">Enviar</button>
        </form>
      </section>
    </section>
  </main>
</template>
