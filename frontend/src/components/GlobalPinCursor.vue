<script setup>
import cursorImage from "../assets/gigachad_cursor.png";
import "../assets/css/global-pin-cursor.css";
import { useGlobalCursor } from "../composables/useGlobalCursor";

const { cursorVisible, cursorX, cursorY, customCursorEnabled } = useGlobalCursor();
</script>

<template>
  <div
    v-if="customCursorEnabled"
    class="gcursor"
    :class="{ 'is-visible': cursorVisible }"
    :style="{
      '--gcursor-image': `url(${cursorImage})`,
      left: `${cursorX}px`,
      top: `${cursorY}px`,
    }"
    aria-hidden="true"
  >
    <span class="gcursor-face"></span>
  </div>
</template>
