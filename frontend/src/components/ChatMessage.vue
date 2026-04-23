<script setup>
import { computed } from "vue";

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  currentUserId: {
    type: String,
    default: "",
  },
  currentUserRole: {
    type: String,
    default: "",
  },
  activeConversationType: {
    type: String,
    default: "channel",
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  editingText: {
    type: String,
    default: "",
  },
  isDeletePending: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "user-click",
  "start-edit",
  "delete-message",
  "confirm-delete-message",
  "cancel-delete-message",
  "update:editing-text",
  "save-edit",
  "cancel-edit",
]);

const canEdit = computed(
  () => props.message.senderId && props.message.senderId === props.currentUserId
);

const canDelete = computed(
  () =>
    canEdit.value ||
    (props.currentUserRole === "admin" && props.activeConversationType === "channel")
);

function openUserCard(event) {
  emit("user-click", { message: props.message, event });
}

function startEditing() {
  emit("start-edit", props.message);
}

function deleteMessage() {
  emit("delete-message", props.message);
}

function confirmDeleteMessage() {
  emit("confirm-delete-message", props.message);
}

function cancelDeleteMessage() {
  emit("cancel-delete-message");
}
</script>

<template>
  <article class="dv-message" :class="{ 'is-own': message.own, 'is-editing': isEditing }">
    <button type="button" class="dv-message-mark dv-message-mark-button" @click="openUserCard">
      <img
        v-if="message.avatarBase64"
        class="dv-message-avatar"
        :src="`data:;base64,${message.avatarBase64}`"
        :alt="`Avatar de ${message.author}`"
      />
      <span v-else>{{ message.initials }}</span>
    </button>

    <div class="dv-bubble">
      <header class="dv-message-head">
        <button type="button" class="dv-message-author-button" @click="openUserCard">
          <strong>{{ message.author }}</strong>
          <span v-if="message.username">@{{ message.username }}</span>
        </button>

        <div class="dv-message-meta">
          <time :datetime="message.createdAt">{{ message.time }}</time>
          <span v-if="message.editedAt" class="dv-message-edited">Editado</span>

          <div v-if="canEdit || canDelete" class="dv-message-actions">
            <button
              v-if="canEdit"
              class="dv-message-action-btn"
              type="button"
              @click="startEditing"
            >
              Editar
            </button>

            <button
              v-if="canDelete && !isDeletePending"
              class="dv-message-action-btn is-danger"
              type="button"
              @click="deleteMessage"
            >
              Eliminar
            </button>

            <template v-if="canDelete && isDeletePending">
              <span class="dv-message-delete-confirm-label">Confirmar</span>
              <button
                class="dv-message-action-btn is-danger"
                type="button"
                @click="confirmDeleteMessage"
              >
                Si
              </button>
              <button class="dv-message-action-btn" type="button" @click="cancelDeleteMessage">
                No
              </button>
            </template>
          </div>
        </div>
      </header>

      <div v-if="isEditing" class="dv-message-editor">
        <textarea
          :value="editingText"
          class="dv-input dv-message-edit-input"
          rows="3"
          maxlength="4000"
          @input="emit('update:editing-text', $event.target.value)"
          @keydown.enter.exact.prevent="emit('save-edit', message)"
          @keydown.esc.prevent="emit('cancel-edit')"
        ></textarea>

        <div class="dv-message-edit-actions">
          <button class="dv-request-btn" type="button" @click="emit('cancel-edit')">
            Cancelar
          </button>
          <button
            class="dv-request-btn is-accept"
            type="button"
            @click="emit('save-edit', message)"
          >
            Guardar
          </button>
        </div>
      </div>

      <p v-else>{{ message.text }}</p>
    </div>
  </article>
</template>
