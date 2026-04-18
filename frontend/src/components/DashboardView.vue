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
    closeProfileModal,
    handleAvatarInput,
    jumpToLatestMessages,
    messagesContainerRef,
    onMessagesScroll,
    outgoingFriendRequests,
    openProfileModal,
    pendingFriendActionId,
    pendingMessagesBelow,
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

        <section
          class="dv-user"
          role="button"
          tabindex="0"
          @click="openProfileModal"
          @keydown.enter.prevent="openProfileModal"
        >
          <div v-if="currentUser.avatarBase64" class="dv-user-mark dv-user-mark-avatar">
            <img
              class="dv-user-avatar"
              :src="`data:;base64,${currentUser.avatarBase64}`"
              alt="Avatar de perfil"
            />
          </div>
          <div v-else class="dv-user-mark">
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
                  <div v-if="request.avatarUrl" class="dv-friend-mark dv-friend-mark-avatar">
                    <img
                      class="dv-friend-avatar"
                      :src="request.avatarUrl"
                      :alt="`Avatar de ${request.name}`"
                    />
                  </div>
                  <div v-else class="dv-friend-mark">{{ request.initials }}</div>
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
                  <div v-if="request.avatarUrl" class="dv-friend-mark dv-friend-mark-avatar">
                    <img
                      class="dv-friend-avatar"
                      :src="request.avatarUrl"
                      :alt="`Avatar de ${request.name}`"
                    />
                  </div>
                  <div v-else class="dv-friend-mark">{{ request.initials }}</div>
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
                <div v-if="friend.avatarUrl" class="dv-friend-mark dv-friend-mark-avatar">
                  <img
                    class="dv-friend-avatar"
                    :src="friend.avatarUrl"
                    :alt="`Avatar de ${friend.name}`"
                  />
                </div>
                <div v-else class="dv-friend-mark">{{ friend.initials }}</div>
                <div>
                  <strong>{{ friend.name }}</strong>
                  <p>@{{ friend.username }}</p>
                </div>
                <div style="display: flex; gap: 0.5rem">
                  <button
                    class="dv-request-btn"
                    style="background-color: #4caf50; color: white"
                    title="Enviar mensaje directo"
                    type="button"
                    @click="openDMWithFriend(friend.user_id, friend.name, friend.username)"
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
          <div ref="messagesContainerRef" class="dv-messages" @scroll="onMessagesScroll">
            <p v-if="!activeMessages.length" class="dv-social-empty">
              Aun no hay mensajes en este chat.
            </p>
            <article
              v-for="message in activeMessages"
              :key="message.id"
              class="dv-message"
              :class="{ 'is-own': message.own }"
            >
              <div v-if="message.avatarBase64" class="dv-message-mark dv-message-mark-avatar">
                <img
                  class="dv-message-avatar"
                  :src="`data:;base64,${message.avatarBase64}`"
                  :alt="`Avatar de ${message.author}`"
                />
              </div>
              <div v-else class="dv-message-mark">{{ message.initials }}</div>
              <div class="dv-bubble">
                <strong>{{ message.author }}</strong>
                <p>{{ message.text }}</p>
              </div>
            </article>
          </div>

          <button
            v-if="showScrollToLatest"
            class="dv-scroll-latest"
            type="button"
            @click="jumpToLatestMessages"
          >
            {{ pendingMessagesBelow > 1 ? `${pendingMessagesBelow} nuevos` : "Nuevo mensaje" }}
            <span>Bajar</span>
          </button>

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

      <div v-if="profileModalOpen" class="dv-modal-backdrop" @click.self="closeProfileModal">
        <section class="dv-modal" role="dialog" aria-modal="true" aria-label="Editar perfil">
          <header class="dv-modal-head">
            <p class="dv-eyebrow">Perfil</p>
            <button class="dv-modal-close" type="button" @click="closeProfileModal">Cerrar</button>
          </header>

          <div class="dv-modal-avatar">
            <div v-if="profileAvatarPreview" class="dv-modal-avatar-preview">
              <img :src="profileAvatarPreview" alt="Vista previa del avatar" />
            </div>
            <div v-else class="dv-modal-avatar-preview is-fallback">
              {{
                (profileName || currentUser.name || currentUser.username || "G")
                  .slice(0, 1)
                  .toUpperCase()
              }}
            </div>

            <div class="dv-modal-avatar-actions">
              <label class="dv-modal-file-btn">
                Subir imagen
                <input type="file" accept="image/*" @change="handleAvatarInput" />
              </label>
              <button class="dv-request-btn is-reject" type="button" @click="removeAvatarFromProfile">
                Quitar
              </button>
            </div>
          </div>

          <form class="dv-modal-form" @submit.prevent="saveProfileChanges">
            <label>
              <span>Nombre</span>
              <input v-model="profileName" class="dv-friend-input" type="text" maxlength="100" />
            </label>
            <label>
              <span>Username</span>
              <input v-model="profileUsername" class="dv-friend-input" type="text" maxlength="30" />
            </label>
            <label>
              <span>Bio</span>
              <textarea v-model="profileBio" class="dv-input dv-modal-bio" maxlength="160"></textarea>
            </label>

            <p v-if="profileError" class="dv-social-error">{{ profileError }}</p>
            <p v-else-if="profileSuccess" class="dv-social-empty">{{ profileSuccess }}</p>

            <div class="dv-modal-actions">
              <button class="dv-request-btn" type="button" @click="closeProfileModal">
                Cancelar
              </button>
              <button class="dv-send dv-modal-save" :disabled="savingProfile" type="submit">
                {{ savingProfile ? "Guardando..." : "Guardar" }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  </template>
