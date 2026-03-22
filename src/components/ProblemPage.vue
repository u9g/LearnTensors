<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { marked } from "marked";
import TopBar from "./TopBar.vue";

interface TestCase {
  id: number;
  input: string;
  expected_output: string;
}

interface Problem {
  id: number;
  name: string;
  slug: string;
  description: string;
  starter_code: string;
  difficulty: "Easy" | "Medium" | "Hard";
  test_cases: TestCase[];
}

const props = defineProps<{ problem: Problem }>();

const difficultyClass = computed(
  () => "difficulty-" + props.problem.difficulty.toLowerCase(),
);

const renderedDescription = computed(() => {
  return marked.parse(props.problem.description) as string;
});

const editorEl = ref<HTMLElement | null>(null);
const editorReady = ref(false);
let tyCleanup: (() => void) | null = null;

const isDark = ref(localStorage.getItem("editor-theme") !== "light");
const themeToggleEl = ref<HTMLElement | null>(null);
let monacoRef: typeof import("monaco-editor") | null = null;

function toggleTheme() {
  const btn = themeToggleEl.value;
  if (!btn || !monacoRef) return;

  const newDark = !isDark.value;
  const apply = () => {
    isDark.value = newDark;
    monacoRef!.editor.setTheme(newDark ? "learntensors" : "vs");
    localStorage.setItem("editor-theme", newDark ? "dark" : "light");
    const s = document.documentElement.style;
    if (newDark) {
      s.removeProperty("--bg"); s.removeProperty("--bg2"); s.removeProperty("--bg3");
      s.removeProperty("--fg"); s.removeProperty("--fg2"); s.removeProperty("--border");
    } else {
      s.setProperty("--bg", "#fff"); s.setProperty("--bg2", "#f5f5f5");
      s.setProperty("--bg3", "#e8e8e8"); s.setProperty("--fg", "#1e1e1e");
      s.setProperty("--fg2", "#333"); s.setProperty("--border", "#ccc");
    }
  };

  if (!document.startViewTransition) {
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

onMounted(async () => {
  const monaco = await import("monaco-editor");
  monacoRef = monaco;
  const editorWorker = await import("monaco-editor/esm/vs/editor/editor.worker?worker");
  self.MonacoEnvironment = {
    getWorker: () => new editorWorker.default(),
  };

  monaco.editor.defineTheme("learntensors", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: { "editor.background": "#1e1e1e" },
  });
  if (!editorEl.value) return;

  editorReady.value = true;
  const editor = monaco.editor.create(editorEl.value, {
    value: props.problem.starter_code,
    language: "python",
    theme: isDark.value ? "learntensors" : "vs",
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12 },
    automaticLayout: true,
    tabSize: 4,
    renderLineHighlight: "line",
    cursorBlinking: "smooth",
    smoothScrolling: true,
    "semanticHighlighting.enabled": true,
    acceptSuggestionOnEnter: "off",
  });

  // Workaround for vscode's built-in browser (BrowserView) which intercepts
  // Enter and Option+Arrow keydown events before they reach web content.
  // See https://github.com/microsoft/vscode/pull/303799
  editor.addCommand(monaco.KeyCode.Enter, () => {
    editor.trigger("keyboard", "type", { text: "\n" });
  });

  // Option+Arrow arrives as a corrupted keydown (empty key/code/keyCode)
  // because BrowserView's before-input-event preventDefault's it. The keyup
  // correctly reports the arrow key, so we count broken keydowns and fire
  // the appropriate word-navigation command on keyup.
  const editorDom = editor.getDomNode();
  const textarea = editorDom?.querySelector<HTMLTextAreaElement>("textarea.inputarea");
  if (textarea) {
    let brokenAltKeydowns = 0;
    let shiftHeld = false;

    textarea.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.altKey && e.key === "" && e.code === "" && e.keyCode === 0) {
        brokenAltKeydowns++;
        shiftHeld = e.shiftKey;
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    textarea.addEventListener("keyup", (e: KeyboardEvent) => {
      if (brokenAltKeydowns > 0 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const isLeft = e.key === "ArrowLeft";
        const command = shiftHeld
          ? (isLeft ? "cursorWordLeftSelect" : "cursorWordRightSelect")
          : (isLeft ? "cursorWordLeft" : "cursorWordRight");
        for (let i = 0; i < brokenAltKeydowns; i++) {
          editor.trigger("keyboard", command, {});
        }
        brokenAltKeydowns = 0;
        e.preventDefault();
        e.stopPropagation();
      } else {
        brokenAltKeydowns = 0;
      }
    }, true);
  }

  // Initialize ty type checker (WASM) for diagnostics, hover, completions, etc.
  try {
    const { initTyChecker } = await import("../composables/useTyChecker");
    tyCleanup = await initTyChecker(
      monaco,
      editor,
      props.problem.starter_code,
    );
  } catch (e) {
    console.warn("ty type checker failed to load:", e);
  }
});

onUnmounted(() => {
  tyCleanup?.();
});
</script>

<template>
  <TopBar />
  <div class="layout">
    <div class="left-panel">
      <div class="problem-header">
        <h1 class="problem-title">{{ problem.id }}. {{ problem.name }}</h1>
        <span class="problem-difficulty" :class="difficultyClass">{{
          problem.difficulty
        }}</span>
      </div>
      <div class="problem-description" v-html="renderedDescription"></div>
      <div v-if="problem.test_cases.length > 0" class="test-cases">
        <div class="section-label">Test Cases</div>
        <div
          v-for="(tc, i) in problem.test_cases"
          :key="tc.id"
          class="test-case"
        >
          <div class="test-case-label">Test {{ i + 1 }} — Input</div>
          <pre><code>{{ tc.input }}</code></pre>
          <div class="test-case-label" style="margin-top: 8px">
            Expected Output
          </div>
          <pre><code>{{ tc.expected_output }}</code></pre>
        </div>
      </div>
    </div>
    <div class="right-panel">
      <div class="editor-tabs">
        <div class="editor-tab">solution.py</div>
      </div>
      <div class="editor-container">
        <pre
          v-if="!editorReady"
          class="editor-placeholder"
        ><code>{{ problem.starter_code }}</code></pre>
        <div
          ref="editorEl"
          style="width: 100%; height: 100%; position: absolute; top: 0; left: 0"
        ></div>
        <button
          v-if="editorReady"
          ref="themeToggleEl"
          class="theme-toggle"
          :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggleTheme"
        >
          <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  background: var(--bg, #1e1e1e);
  color: var(--fg, #f5f5f5);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
  overflow: hidden;
  height: 100vh;
}
.layout {
  display: flex;
  height: calc(100vh - 50px);
}
.left-panel {
  width: 40%;
  min-width: 0;
  overflow-y: auto;
  padding: 24px;
  border-right: 1px solid var(--border, #333);
  background: var(--bg2, #1a1a1a);
}
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg, #1e1e1e);
  min-width: 0;
}
.editor-tabs {
  display: flex;
  align-items: center;
  height: 36px;
  background: var(--bg3, #252526);
  border-bottom: 1px solid var(--border, #333);
  padding: 0 8px;
  flex-shrink: 0;
}
.editor-tab {
  font-size: 13px;
  color: var(--fg2, #ccc);
  padding: 6px 12px;
  background: var(--bg, #1e1e1e);
  border-top: 1px solid #007acc;
  border-radius: 0;
}
.theme-toggle {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #555;
  background: #2a2a2a;
  color: #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.2s, background 0.2s, border-color 0.2s;
}
.theme-toggle:hover {
  opacity: 1;
  background: #3a3a3a;
  border-color: #888;
}
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 9999;
}
.editor-container {
  flex: 1;
  min-height: 0;
  position: relative;
}
.editor-placeholder {
  margin: 0;
  padding: 12px 0 0 64px;
  font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace;
  font-size: 14px;
  color: var(--fg2, #d4d4d4);
  background: var(--bg, #1e1e1e);
  height: 100%;
  overflow: hidden;
  white-space: pre;
}
.editor-placeholder code {
  font: inherit;
  color: inherit;
}
.problem-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.problem-title {
  font-size: 20px;
  font-weight: 600;
}
.difficulty-easy {
  color: #00b8a3;
}
.difficulty-medium {
  color: #ffc01e;
}
.difficulty-hard {
  color: #ff375f;
}
.problem-difficulty {
  font-size: 14px;
}
.problem-description {
  font-size: 14px;
  line-height: 1.7;
  color: var(--fg2, #ccc);
  word-break: break-word;
}
.problem-description h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #f5f5f5);
  margin: 20px 0 8px;
}
.problem-description h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--fg, #f5f5f5);
  margin: 16px 0 6px;
}
.problem-description p {
  margin: 8px 0;
}
.problem-description code {
  font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace;
  font-size: 13px;
  background: #2a2a2a;
  padding: 2px 5px;
  border-radius: 3px;
  color: #e0e0e0;
}
.problem-description pre {
  background: #262626;
  border-radius: 6px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 8px 0;
}
.problem-description pre code {
  background: none;
  padding: 0;
  font-size: 13px;
  color: #e0e0e0;
}
.problem-description ul,
.problem-description ol {
  padding-left: 20px;
  margin: 8px 0;
}
.problem-description li {
  margin: 4px 0;
}
.problem-description strong {
  color: var(--fg, #f5f5f5);
}
.test-cases {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--fg, #f5f5f5);
}
.test-case {
  background: #262626;
  border-radius: 6px;
  padding: 12px 14px;
  overflow-x: auto;
}
.test-case-label {
  color: #888;
  margin-bottom: 4px;
  font-size: 12px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
}
.test-case pre {
  background: none;
  margin: 4px 0;
  padding: 0;
  border-radius: 0;
}
.test-case code {
  font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace;
  font-size: 13px;
  color: #e0e0e0;
  white-space: pre-wrap;
  word-break: break-word;
}

.left-panel::-webkit-scrollbar {
  width: 8px;
}
.left-panel::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.left-panel::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}
.left-panel::-webkit-scrollbar-thumb:hover {
  background: #777;
}

@media (max-width: 768px) {
  body {
    overflow: auto;
    height: auto;
  }
  .layout {
    flex-direction: column;
    height: auto;
  }
  .left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border, #333);
    padding: 16px;
  }
  .right-panel {
    height: 60vh;
    min-height: 300px;
  }
  .problem-title {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .top-bar-logo {
    font-size: 18px;
  }
  .left-panel {
    padding: 12px;
  }
  .problem-title {
    font-size: 16px;
  }
  .problem-description {
    font-size: 13px;
  }
}
</style>
