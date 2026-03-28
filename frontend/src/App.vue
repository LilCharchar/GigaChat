<script setup>
import GlobalPinCursor from "./components/GlobalPinCursor.vue";
import { RouterView } from "vue-router";
</script>

<template>
  <div class="app-shell">
    <RouterView />
    <GlobalPinCursor />
  </div>
</template>
