<script setup lang="ts">
import TopBar from "./components/TopBar.vue";
import BlogIndex from "./components/BlogIndex.vue";
import BlogPost from "./components/BlogPost.vue";

if (typeof localStorage !== "undefined" && localStorage.getItem("editor-theme") === "light") {
  document.documentElement.classList.add("light-mode");
  const s = document.documentElement.style;
  s.setProperty("--bg", "#fff");
  s.setProperty("--bg2", "#f5f5f5");
  s.setProperty("--bg3", "#e8e8e8");
  s.setProperty("--fg", "#1e1e1e");
  s.setProperty("--fg2", "#333");
  s.setProperty("--border", "#ccc");
  s.setProperty("--code-bg", "#f0f0f0");
}

const props = defineProps<{ path?: string }>();

const currentPath =
  props.path ?? (typeof window !== "undefined" ? window.location.pathname : "/blog/");
const postMatch = currentPath.match(/^\/blog\/([a-z0-9-]+)\/?$/);
const slug = postMatch ? postMatch[1] : null;
</script>

<template>
  <TopBar />
  <BlogPost v-if="slug" :slug="slug" />
  <BlogIndex v-else />
</template>

<style>
html, body {
  background-color: #1a1a1a;
}
.light-mode, .light-mode body {
  background-color: #fff;
}
</style>
