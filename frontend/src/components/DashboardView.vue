<script setup>
import "../assets/css/dashboard-view.css";
import { useDashboardView } from "../composables/useDashboardView";

const {
  activeConversation,
  activeConversationId,
  activeMessages,
  activeRoster,
  conversations,
  currentUser,
  draft,
  handleLogout,
  loadingAuth,
  selectConversation,
  sendMessage,
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
          {{ (currentUser.username || currentUser.email || "G").slice(0, 1).toUpperCase() }}
        </div>
        <div>
          <strong>{{ currentUser.username || "Operador" }}</strong>
          <p>{{ currentUser.email || "sin-correo" }}</p>
        </div>
      </section>

      <section class="dv-list-block">
        <div class="dv-head">
          <span>Canales</span>
          <span>{{ conversations.length }}</span>
        </div>

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

      <button class="dv-logout" :disabled="loadingAuth" type="button" @click="handleLogout">
        {{ loadingAuth ? "Saliendo..." : "Cerrar sesion" }}
      </button>
    </aside>

    <section class="dv-main">
      <header class="dv-top">
        <div class="dv-hero">
          <div class="dv-hero-copy">
            <p class="dv-eyebrow">Chat</p>
            <h2>{{ activeConversation.name }}</h2>
          </div>
        </div>

        <aside class="dv-friends">
          <div class="dv-head">
            <span>Amigos</span>
            <span>{{ activeRoster.length }}</span>
          </div>

          <article v-for="member in activeRoster" :key="member.name" class="dv-friend">
            <div class="dv-friend-mark">{{ member.initials }}</div>
            <strong>{{ member.name }}</strong>
            <span class="dv-friend-dot" :class="{ 'is-live': member.online }"></span>
          </article>
        </aside>
      </header>

      <section class="dv-chat">
        <div class="dv-messages">
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
          ></textarea>
          <button class="dv-send" type="submit">Enviar</button>
        </form>
      </section>
    </section>
  </main>
</template>
