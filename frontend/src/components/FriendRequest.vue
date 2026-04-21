<script setup>
defineProps({
  request: {
    type: Object,
    required: true,
  },
  pendingFriendActionId: {
    type: String,
    default: "",
  },
  // "incoming" muestra botones aceptar/rechazar, "outgoing" muestra pill pendiente
  variant: {
    type: String,
    default: "incoming",
    validator: (v) => ["incoming", "outgoing"].includes(v),
  },
});

const emit = defineEmits(["accept", "reject"]);
</script>

<template>
  <article class="dv-friend dv-friend-request">
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

    <!-- Entrante: aceptar / rechazar -->
    <div v-if="variant === 'incoming'" class="dv-request-actions">
      <button
        class="dv-request-btn is-accept"
        :disabled="pendingFriendActionId === request.id"
        type="button"
        @click="emit('accept', request.id)"
      >
        Aceptar
      </button>
      <button
        class="dv-request-btn is-reject"
        :disabled="pendingFriendActionId === request.id"
        type="button"
        @click="emit('reject', request.id)"
      >
        Rechazar
      </button>
    </div>

    <!-- Saliente: pill pendiente -->
    <span v-else class="dv-request-pill">Pendiente</span>
  </article>
</template>
