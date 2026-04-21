<script setup>
defineProps({
  message: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <article class="dv-message" :class="{ 'is-own': message.own }">
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
</template>
