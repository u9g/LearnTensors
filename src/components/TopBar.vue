<script setup lang="ts">
import { inject, ref, watch, type Ref } from "vue";

const editorReady = inject<Ref<boolean>>("editorReady", { value: false } as any);
const isRunning = inject<Ref<boolean>>("isRunning", { value: false } as any);
const isDark = inject<Ref<boolean>>("isDark", { value: true } as any);
const runCode = inject<() => void>("runCode", () => {});
const toggleTheme = inject<() => void>("toggleTheme", () => {});
const parentThemeToggleEl = inject<Ref<HTMLElement | null>>("themeToggleEl", { value: null } as any);
const themeToggleEl = ref<HTMLElement | null>(null);
watch(themeToggleEl, (el) => { parentThemeToggleEl.value = el; });
</script>

<template>
  <header class="top-bar">
    <a href="/" class="top-bar-logo">LearnTensors</a>
    <div class="top-bar-center">
      <button
        v-if="editorReady"
        class="run-button"
        :disabled="isRunning"
        @click="runCode"
      >
        <svg
          v-if="!isRunning"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <polygon points="5,3 19,12 5,21" />
        </svg>
        <span v-else class="spinner"></span>
        {{ isRunning ? "Running..." : "Run" }}
      </button>
    </div>
    <nav class="top-bar-nav">
      <button
        ref="themeToggleEl"
        class="top-bar-theme-toggle"
        :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="toggleTheme"
      >
        <svg
          v-if="isDark"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg
          v-else
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
      <a href="/blog/" class="top-bar-link">Engineering Blog</a>
    </nav>
  </header>
</template>

<style>
@font-face {
  font-family: 'Skarpa';
  src: url('/fonts/Skarpa-Regular.ttf') format('truetype');
  font-display: block;
}

.top-bar {
  background-color: #262626;
  height: 50px;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.top-bar-logo {
  font-family: 'Skarpa', sans-serif;
  font-size: 24px;
  color: #F5F5F5;
  letter-spacing: 2px;
  text-decoration: none;
}

.top-bar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* Light mode header */
.light-mode .top-bar {
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.light-mode .top-bar-logo {
  color: #1e1e1e;
}

.top-bar-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.top-bar-theme-toggle {
  background: none;
  border: none;
  color: #a0a0a0;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.top-bar-theme-toggle:hover {
  color: #f5f5f5;
}

.light-mode .top-bar-theme-toggle {
  color: #666;
}

.light-mode .top-bar-theme-toggle:hover {
  color: #1e1e1e;
}

.top-bar-link {
  font-family: 'Skarpa', sans-serif;
  color: #a0a0a0;
  font-size: 16px;
  letter-spacing: 1px;
  text-decoration: none;
  transition: color 0.15s;
}

.top-bar-link:hover {
  color: #f5f5f5;
}

.light-mode .top-bar-link {
  color: #666;
}

.light-mode .top-bar-link:hover {
  color: #1e1e1e;
}
</style>
