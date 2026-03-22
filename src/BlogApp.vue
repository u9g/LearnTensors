<script setup lang="ts">
import TopBar from "./components/TopBar.vue";
import BlogIndex from "./components/BlogIndex.vue";
import BlogPost from "./components/BlogPost.vue";

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
</style>
