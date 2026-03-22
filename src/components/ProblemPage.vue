<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { marked } from "marked";
import TopBar from "./TopBar.vue";
import {
  darkModernTheme,
  lightModernTheme,
  enhancePythonTokenizer,
} from "../composables/darkModernTheme";

// Kick off heavy imports immediately (don't wait for onMounted)
const monacoPromise =
  typeof window !== "undefined" ? import("monaco-editor") : null;
const workerPromise =
  typeof window !== "undefined"
    ? import("monaco-editor/esm/vs/editor/editor.worker?worker")
    : null;
const tyPromise =
  typeof window !== "undefined" ? import("../composables/useTyChecker") : null;

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
const leftPanelEl = ref<HTMLElement | null>(null);
const editorReady = ref(false);
let tyChecker: import("../composables/useTyChecker").TyChecker | null = null;

const activeTab = ref("solution");
let editorInstance: any = null;
let solutionCode = props.problem.starter_code;

const tabs = computed(() => {
  const t = [{ id: "solution", label: "solution.py" }];
  props.problem.test_cases.forEach((_, i) => {
    t.push({ id: `test-${i + 1}`, label: `test_${i + 1}.py` });
  });
  return t;
});

function forceTokenizeAll(
  editor: import("monaco-editor").editor.IStandaloneCodeEditor,
) {
  const model = editor.getModel() as any;
  if (model?.tokenization?.forceTokenization) {
    model.tokenization.forceTokenization(model.getLineCount());
  }
}

function switchTab(tabId: string) {
  if (!editorInstance || activeTab.value === tabId) return;
  // Save solution code when leaving solution tab
  if (activeTab.value === "solution") {
    solutionCode = editorInstance.getValue();
    // Keep solution.py up to date in ty workspace for test imports
    tyChecker?.updateSolution(solutionCode);
  }
  activeTab.value = tabId;
  if (tabId === "solution") {
    tyChecker?.switchFile("solution.py", solutionCode);
    editorInstance.setValue(solutionCode);
    editorInstance.updateOptions({ readOnly: false });
  } else {
    const idx = parseInt(tabId.split("-")[1]) - 1;
    const tc = props.problem.test_cases[idx];
    tyChecker?.switchFile(`test_${idx + 1}.py`, tc.input);
    editorInstance.setValue(tc.input);
    editorInstance.updateOptions({ readOnly: true });
  }
  forceTokenizeAll(editorInstance);
}

const isDark = ref(localStorage.getItem("editor-theme") !== "light");
if (!isDark.value) document.documentElement.classList.add("light-mode");
const themeToggleEl = ref<HTMLElement | null>(null);
let monacoRef: typeof import("monaco-editor") | null = null;

function toggleTheme() {
  const btn = themeToggleEl.value;
  if (!btn || !monacoRef) return;

  const newDark = !isDark.value;
  const apply = () => {
    isDark.value = newDark;
    const theme = newDark ? "learntensors-dark" : "learntensors-light";
    monacoRef!.editor.setTheme(theme);
    localStorage.setItem("editor-theme", newDark ? "dark" : "light");
    // Re-colorize all code blocks with new theme
    if (leftPanelEl.value) {
      for (const el of leftPanelEl.value.querySelectorAll<HTMLElement>(
        "pre code",
      )) {
        monacoRef!.editor.colorizeElement(el, { theme });
      }
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
  // Await pre-started imports (fired at module scope, not here)
  const [monaco, editorWorker] = await Promise.all([
    monacoPromise!,
    workerPromise!,
  ]);

  monacoRef = monaco;
  self.MonacoEnvironment = {
    getWorker: () => new editorWorker.default(),
  };

  monaco.editor.defineTheme("learntensors-dark", darkModernTheme as any);
  monaco.editor.defineTheme("learntensors-light", lightModernTheme as any);
  enhancePythonTokenizer(monaco);
  if (!editorEl.value) return;

  editorReady.value = true;
  const editor = (editorInstance = monaco.editor.create(editorEl.value, {
    value: props.problem.starter_code,
    language: "python",
    theme: isDark.value ? "learntensors-dark" : "learntensors-light",
    fontSize: 14,
    minimap: { enabled: false },
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { useShadows: false },
    scrollBeyondLastLine: false,
    padding: { top: 12 },
    automaticLayout: true,
    tabSize: 4,
    renderLineHighlight: "line",
    cursorBlinking: "smooth",
    smoothScrolling: true,
    "semanticHighlighting.enabled": true,
  }));
  forceTokenizeAll(editor);

  // Initialize ty type checker — fire-and-forget (diagnostics/hover/completions, not visual)
  void (async () => {
    try {
      const tyModule = await tyPromise!;
      tyChecker = await tyModule.initTyChecker(
        monaco,
        editor,
        props.problem.starter_code,
      );
    } catch (e) {
      console.warn("ty type checker failed to load:", e);
    }
  })();

  // Colorize all code blocks in the left panel (description + test cases) using Monaco
  if (leftPanelEl.value) {
    const codeEls = leftPanelEl.value.querySelectorAll<HTMLElement>("pre code");
    for (const el of codeEls) {
      const lang = el.className.match(/language-(\w+)/)?.[1] || "python";
      el.setAttribute("data-lang", lang);
      el.textContent = el.textContent?.replace(/\n$/, "") ?? "";
      await monaco.editor.colorizeElement(el, {
        theme: isDark.value ? "learntensors-dark" : "learntensors-light",
      });
    }
  }
});

onUnmounted(() => {
  tyChecker?.dispose();
});
</script>

<template>
  <TopBar />
  <div class="layout">
    <div ref="leftPanelEl" class="left-panel">
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
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="editor-tab"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.label }}
        </div>
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
  color: #888;
  padding: 6px 12px;
  background: var(--bg3, #252526);
  border-top: 1px solid transparent;
  border-radius: 0;
  cursor: pointer;
  user-select: none;
}
.editor-tab:hover {
  color: var(--fg2, #ccc);
}
.editor-tab.active {
  color: var(--fg2, #ccc);
  background: var(--bg, #1e1e1e);
  border-top: 1px solid #007acc;
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
  transition:
    opacity 0.2s,
    background 0.2s,
    border-color 0.2s;
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
  overflow: hidden;
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
.editor-container .monaco-editor,
.editor-container .overflow-guard {
  outline: none !important;
  border: none !important;
}
.editor-container .margin-view-overlays {
  border: none !important;
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
  background: var(--code-bg, #2a2a2a);
  padding: 2px 5px;
  border-radius: 3px;
  color: var(--fg2, #e0e0e0);
}
.problem-description pre {
  background: var(--code-bg, #262626);
  border-radius: 6px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 8px 0;
}
.problem-description pre code {
  background: none;
  padding: 0;
  font-size: 13px;
  color: var(--fg2, #e0e0e0);
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
  background: var(--code-bg, #262626);
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
  color: var(--fg2, #e0e0e0);
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

/* Light mode scrollbar for left panel */
:global(.light-mode) .left-panel::-webkit-scrollbar-track {
  background: #f0f0f0;
}
:global(.light-mode) .left-panel::-webkit-scrollbar-thumb {
  background: #c0c0c0;
}
:global(.light-mode) .left-panel::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}
:global(.light-mode) .left-panel {
  scrollbar-color: #c0c0c0 #f0f0f0;
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
