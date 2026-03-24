<script setup lang="ts">
import { ref, onMounted } from "vue";
import TopBar from "./components/TopBar.vue";
import ProblemList from "./components/ProblemList.vue";

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

const user = ref<{ login: string; avatarUrl: string } | null>(null);

onMounted(async () => {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.authenticated) {
      user.value = { login: data.login, avatarUrl: data.avatarUrl };
    }
  } catch {
    // Ignore
  }
});
</script>

<template>
  <TopBar :user="user" />
  <ProblemList :user="user" />
</template>
