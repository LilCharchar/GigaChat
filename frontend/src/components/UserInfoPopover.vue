<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "timeout-user", "ban-user"]);

const timeoutMinutes = ref(10);
const timeoutReason = ref("");
const banReason = ref("");

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return;
    }

    timeoutMinutes.value = 10;
    timeoutReason.value = "";
    banReason.value = "";
  }
);

const avatarLabel = computed(() => {
  const name = props.user?.name || props.user?.username || "U";
  return name.slice(0, 1).toUpperCase();
});

function closePopover() {
  emit("close");
}

function submitTimeout() {
  emit("timeout-user", {
    minutes: Number(timeoutMinutes.value),
    reason: timeoutReason.value.trim() || null,
  });
}

function submitBan() {
  emit("ban-user", {
    reason: banReason.value.trim() || null,
  });
}
</script>

<template>
  <div v-if="visible" class="dv-user-popover-layer" @click="closePopover">
    <section
      class="dv-user-popover"
      :style="{ left: `${x}px`, top: `${y}px` }"
      role="dialog"
      aria-label="Información del usuario"
      @click.stop
    >
      <header class="dv-user-popover-head">
        <div class="dv-user-popover-avatar">
          <img
            v-if="user?.avatarBase64"
            :src="`data:;base64,${user.avatarBase64}`"
            :alt="`Avatar de ${user?.name || user?.username || 'Usuario'}`"
          />
          <span v-else>{{ avatarLabel }}</span>
        </div>

        <div class="dv-user-popover-copy">
          <strong>{{ user?.name || user?.username || "Usuario" }}</strong>
          <p>@{{ user?.username || "sin-username" }}</p>
        </div>
      </header>

      <p v-if="user?.role" class="dv-user-popover-meta">
        <span>Rol: {{ user.role }}</span>
      </p>

      <p v-if="loading" class="dv-social-empty">Cargando información...</p>
      <p v-else-if="error" class="dv-social-error">{{ error }}</p>

      <p v-if="user?.bio" class="dv-user-popover-bio">{{ user.bio }}</p>
      <p v-else class="dv-user-popover-bio is-muted">Sin bio disponible.</p>

      <section v-if="isAdmin" class="dv-user-popover-admin">
        <label>
          <span>Minutos</span>
          <input
            v-model="timeoutMinutes"
            class="dv-friend-input"
            type="number"
            min="1"
            max="43200"
          />
        </label>

        <label>
          <span>Motivo timeout</span>
          <textarea
            v-model="timeoutReason"
            class="dv-input dv-user-popover-textarea"
            maxlength="500"
            placeholder="Opcional"
          ></textarea>
        </label>

        <label>
          <span>Motivo ban</span>
          <textarea
            v-model="banReason"
            class="dv-input dv-user-popover-textarea"
            maxlength="500"
            placeholder="Opcional"
          ></textarea>
        </label>

        <div class="dv-user-popover-actions">
          <button class="dv-request-btn" type="button" @click="closePopover">Cerrar</button>
          <button class="dv-request-btn is-accept" type="button" @click="submitTimeout">
            Timeout
          </button>
          <button class="dv-request-btn is-reject" type="button" @click="submitBan">Ban</button>
        </div>
      </section>

      <button v-else class="dv-request-btn" type="button" @click="closePopover">Cerrar</button>
    </section>
  </div>
</template>
