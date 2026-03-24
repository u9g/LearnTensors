<script setup lang="ts">
import { inject, type Ref } from "vue";
import { stashPendingAuthDraft } from "../lib/drafts";

const props = defineProps<{ message?: string }>();
const emit = defineEmits<{ close: [] }>();
const problem = inject<any | null>("problem", null);
const solutionCode = inject<Ref<string> | null>("solutionCode", null);

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit("close");
}

function onSignInClick() {
  if (problem?.slug && solutionCode) {
    stashPendingAuthDraft(problem.slug, solutionCode.value);
  }
}

const redirectPath = typeof window !== "undefined"
  ? `${window.location.pathname}${window.location.search}${window.location.hash}`
  : "/";
</script>

<template>
  <div class="login-modal-backdrop" @click="onBackdropClick">
    <div class="login-modal">
      <button class="login-modal-close" @click="emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <p class="login-modal-message">{{ message || "Sign in to continue" }}</p>
      <a
        :href="`/api/auth/login?redirect=${encodeURIComponent(redirectPath)}`"
        class="login-modal-button"
        @click="onSignInClick"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        Sign in with GitHub
      </a>
    </div>
  </div>
</template>

<style>
.login-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.login-modal {
  background: var(--bg3, #252526);
  border: 1px solid var(--border, #333);
  border-radius: 12px;
  padding: 32px;
  min-width: 320px;
  position: relative;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.login-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--fg2, #ccc);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.login-modal-close:hover {
  color: var(--fg, #f5f5f5);
}

.login-modal-message {
  font-size: 16px;
  color: var(--fg, #f5f5f5);
  margin-bottom: 24px;
}

.login-modal-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #24292f;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}

.login-modal-button:hover {
  background: #32383f;
}

.light-mode .login-modal-button {
  background: #24292f;
  color: #fff;
}
</style>
