<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, type Ref } from "vue";
import { stashPendingAuthDraft } from "../lib/drafts";

interface AuthUser {
  login: string;
  avatarUrl: string;
}

const props = defineProps<{ showRun?: boolean; user?: AuthUser | null }>();

const problem = inject<any | null>("problem", null);
const solutionCode = inject<Ref<string> | null>("solutionCode", null);
const currentPath = typeof window !== "undefined"
  ? `${window.location.pathname}${window.location.search}${window.location.hash}`
  : "/";
const showUserMenu = ref(false);

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.reload();
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function onClickOutside(e: MouseEvent) {
  const target = e.target instanceof Element ? e.target : null;
  if (!target?.closest(".user-menu-container")) {
    showUserMenu.value = false;
  }
}

function onSignInClick() {
  if (!props.user && problem?.slug && solutionCode) {
    stashPendingAuthDraft(problem.slug, solutionCode.value);
  }
}

const editorReady = inject<Ref<boolean>>("editorReady", ref(false));
const isRunning = inject<Ref<boolean>>("isRunning", ref(false));
const runCode = inject<() => void>("runCode", () => {});
const resetLayout = inject<(() => void) | null>("resetLayout", null);
const monacoRef = inject<Ref<any>>("monacoRef", ref(null));

const isDark = inject<Ref<boolean>>("isDark", ref(
  typeof localStorage !== "undefined"
    ? localStorage.getItem("editor-theme") !== "light"
    : true,
));

const themeToggleEl = ref<HTMLElement | null>(null);

onMounted(() => {
  document.addEventListener("click", onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", onClickOutside);
});

function toggleTheme() {
  const btn = themeToggleEl.value;
  const newDark = !isDark.value;
  const apply = () => {
    isDark.value = newDark;
    localStorage.setItem("editor-theme", newDark ? "dark" : "light");

    const monaco = monacoRef.value;
    if (monaco) {
      const theme = newDark ? "learntensors-dark" : "learntensors-light";
      monaco.editor.setTheme(theme);
    }

    const s = document.documentElement.style;
    if (newDark) {
      document.documentElement.classList.remove("light-mode");
      s.removeProperty("--bg");
      s.removeProperty("--bg2");
      s.removeProperty("--bg3");
      s.removeProperty("--fg");
      s.removeProperty("--fg2");
      s.removeProperty("--border");
      s.removeProperty("--code-bg");
    } else {
      document.documentElement.classList.add("light-mode");
      s.setProperty("--bg", "#fff");
      s.setProperty("--bg2", "#f5f5f5");
      s.setProperty("--bg3", "#e8e8e8");
      s.setProperty("--fg", "#1e1e1e");
      s.setProperty("--fg2", "#333");
      s.setProperty("--border", "#ccc");
      s.setProperty("--code-bg", "#f0f0f0");
    }
  };

  if (!btn || !document.startViewTransition) {
    apply();
    return;
  }

  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(apply);
  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 400,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
}
</script>

<template>
  <header class="top-bar">
    <a href="/" class="top-bar-logo">LearnTensors</a>
    <div class="top-bar-center">
      <button
        v-if="showRun"
        class="run-button"
        :disabled="isRunning"
        @click="editorReady && runCode()"
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
        v-if="resetLayout"
        class="top-bar-theme-toggle"
        title="Reset panel layout"
        @click="resetLayout"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      </button>
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
      <div v-if="user" class="user-menu-container">
        <button class="user-menu-trigger" @click.stop="toggleUserMenu">
          <img :src="user.avatarUrl" :alt="user.login" class="top-bar-avatar" />
        </button>
        <div v-if="showUserMenu" class="user-menu-dropdown">
          <button class="user-menu-item" @click="logout">Sign out</button>
        </div>
      </div>
      <a
        v-else
        class="top-bar-auth-btn"
        :href="`/api/auth/login?redirect=${encodeURIComponent(currentPath)}`"
        @click="onSignInClick"
      >Sign in</a>
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

.user-menu-container {
  position: relative;
}

.user-menu-trigger {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 50%;
  transition: opacity 0.15s;
}

.user-menu-trigger:hover {
  opacity: 0.8;
}

.top-bar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.user-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg3, #252526);
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  min-width: 160px;
  padding: 4px 0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.user-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 13px;
  color: var(--fg2, #ccc);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.user-menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.light-mode .user-menu-dropdown {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.light-mode .user-menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.top-bar-auth-btn {
  font-family: 'Skarpa', sans-serif;
  background: none;
  border: none;
  color: #a0a0a0;
  font-size: 16px;
  letter-spacing: 1px;
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: none;
  transition: color 0.15s;
}

.top-bar-auth-btn:hover {
  color: #f5f5f5;
}

.light-mode .top-bar-auth-btn {
  color: #666;
}

.light-mode .top-bar-auth-btn:hover {
  color: #1e1e1e;
}
</style>
