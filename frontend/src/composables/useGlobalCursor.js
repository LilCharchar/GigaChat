import { onBeforeUnmount, onMounted, ref } from "vue";

export function useGlobalCursor() {
  const cursorX = ref(0);
  const cursorY = ref(0);
  const cursorVisible = ref(false);
  const customCursorEnabled = ref(false);

  function supportsCustomCursor() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches &&
      window.innerWidth > 960
    );
  }

  function updateCursorCapability() {
    customCursorEnabled.value = supportsCustomCursor();

    if (!customCursorEnabled.value) {
      cursorVisible.value = false;
    }
  }

  function handlePointerMove(event) {
    if (!customCursorEnabled.value) return;
    cursorX.value = event.clientX;
    cursorY.value = event.clientY;
    cursorVisible.value = true;
  }

  function handlePointerLeave() {
    cursorVisible.value = false;
  }

  onMounted(() => {
    updateCursorCapability();
    window.addEventListener("resize", updateCursorCapability);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseleave", handlePointerLeave);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateCursorCapability);
    window.removeEventListener("mousemove", handlePointerMove);
    window.removeEventListener("mouseleave", handlePointerLeave);
  });

  return {
    cursorVisible,
    cursorX,
    cursorY,
    customCursorEnabled,
  };
}
