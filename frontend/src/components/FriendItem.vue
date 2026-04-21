<script setup>
defineProps({
  friend: {
    type: Object,
    required: true,
  },
  removingFriendId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["open-dm", "remove-friend"]);
</script>

<template>
  <article class="dv-friend">
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
        @click="emit('open-dm', friend)"
      >
        💬
      </button>
      <button
        class="dv-request-btn is-reject"
        :disabled="removingFriendId === friend.user_id"
        type="button"
        @click="emit('remove-friend', friend.user_id)"
      >
        {{ removingFriendId === friend.user_id ? "Quitando" : "Eliminar" }}
      </button>
    </div>
  </article>
</template>
