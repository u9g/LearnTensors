<script setup lang="ts">
import { ref, onUnmounted } from "vue";

const props = defineProps<{
  direction: "horizontal" | "vertical";
}>();

const emit = defineEmits<{
  resize: [delta: number];
  resizeEnd: [];
}>();

const active = ref(false);
let startPos = 0;

function onMouseDown(e: MouseEvent) {
  e.preventDefault();
  active.value = true;
  startPos = props.direction === "horizontal" ? e.clientX : e.clientY;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.body.style.cursor =
    props.direction === "horizontal" ? "col-resize" : "row-resize";
  document.body.style.userSelect = "none";
}

function onMouseMove(e: MouseEvent) {
  const currentPos =
    props.direction === "horizontal" ? e.clientX : e.clientY;
  const delta = currentPos - startPos;
  startPos = currentPos;
  emit("resize", delta);
}

function onMouseUp() {
  active.value = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  emit("resizeEnd");
}

onUnmounted(() => {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
  <div
    class="resize-handle"
    :class="[direction, { active }]"
    @mousedown="onMouseDown"
  />
</template>

<style scoped>
.resize-handle {
  flex-shrink: 0;
  background: var(--border, #333);
  transition: background 0.15s;
  z-index: 10;
}
.resize-handle:hover,
.resize-handle.active {
  background: #007acc;
}
.resize-handle.horizontal {
  width: 4px;
  cursor: col-resize;
}
.resize-handle.vertical {
  height: 4px;
  cursor: row-resize;
}
</style>
