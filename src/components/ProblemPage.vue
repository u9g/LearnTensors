<script setup lang="ts">
import { ref, reactive, provide, onMounted, watch } from "vue";
import TopBar from "./TopBar.vue";
import ClientOnly from "./ClientOnly.vue";
import SplitLayout from "./layout/SplitLayout.vue";
import { useLayout } from "../composables/useLayout";

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
  test_harness: string;
  test_cases: TestCase[];
}

const props = defineProps<{ problem: Problem }>();

const { layout, moveTab, addTab, removeTab, splitPanel, updateSizesForSplit, resetLayout } =
  useLayout();

// Remove stale submission tabs from persisted layout (from previous problems)
function removeSubmissionTabs(node: any) {
  if (node.type === "panel") {
    const hadActive = node.tabs.some((t: any) => t.id === node.activeTabId && t.id.startsWith("submission-"));
    node.tabs = node.tabs.filter((t: any) => !t.id.startsWith("submission-"));
    if (hadActive) node.activeTabId = node.tabs[0]?.id ?? "";
  } else if (node.type === "split") {
    for (const child of node.children) removeSubmissionTabs(child);
  }
}
removeSubmissionTabs(layout.value);

// Editable test cases — start with DB test cases, user can add more
const testCases = ref<TestCase[]>([...props.problem.test_cases]);

// Shared state for child panels
const solutionCode = ref(props.problem.starter_code);
const cursorPosition = ref<{ lineNumber: number; column: number } | null>(null);
const isDark = ref(
  typeof localStorage !== "undefined"
    ? localStorage.getItem("editor-theme") !== "light"
    : true,
);
if (typeof document !== "undefined" && !isDark.value)
  document.documentElement.classList.add("light-mode");

const monacoRef = ref<any>(null);
const editorReady = ref(false);
const isRunning = ref(false);
const showOutput = ref(false);
const runResults = ref<
  Array<{ test_id: number; passed: boolean; output: string; error: string }>
>([]);
const runError = ref<string | null>(null);
const submissionNumber = ref<number | null>(null);
const runtimeMs = ref<number | null>(null);
const submissionDate = ref<string | null>(null);

function setEditorInstance(_editor: any) {
  // Provided to PanelEditor for lifecycle management
}

function setTyChecker(_checker: any) {
  // Stored by PanelEditor; provided for lifecycle management
}

async function loadCachedResults() {
  try {
    const res = await fetch(`/api/run?problem_id=${props.problem.id}`);
    const data = await res.json();
    if (data.results?.length) {
      runResults.value = data.results;
      submissionNumber.value = data.submission_number ?? null;
      runtimeMs.value = data.runtime_ms ?? null;
      submissionDate.value = data.created_at ?? null;
      showOutput.value = true;
    }
  } catch {
    // Ignore
  }
}

async function runCode() {
  if (isRunning.value) return;

  isRunning.value = true;
  showOutput.value = true;
  runResults.value = [];
  runError.value = null;

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        solution_code: solutionCode.value,
        problem_id: props.problem.id,
        test_harness: props.problem.test_harness,
        test_cases: testCases.value,
      }),
    });
    const data = await res.json();
    runResults.value = data.results ?? [];
    runError.value = data.error ?? null;
    submissionNumber.value = data.submission_number ?? null;
    runtimeMs.value = data.runtime_ms ?? null;
    submissionDate.value = new Date().toISOString();
  } catch {
    runError.value = "Network error — could not reach server";
  } finally {
    isRunning.value = false;
  }
}

// Submission tab support — only one at a time
const submissionCodes = reactive<Record<string, string>>({});
let currentSubmissionTabId: string | null = null;

function openSubmission(id: number, _code: string, allPassed?: boolean) {
  const tabId = `submission-${id}`;

  // Remove existing submission tab if different
  if (currentSubmissionTabId && currentSubmissionTabId !== tabId) {
    removeTab(currentSubmissionTabId);
    delete submissionCodes[currentSubmissionTabId];
  }

  currentSubmissionTabId = tabId;
  addTab("solution", {
    id: tabId,
    panelType: "submission-detail",
    label: allPassed ? "Accepted" : "Failed",
    closable: true,
  });
}

function closeTab(tabId: string) {
  removeTab(tabId);
  if (tabId === currentSubmissionTabId) {
    delete submissionCodes[tabId];
    currentSubmissionTabId = null;
  }
}

// Provide everything to child panels
provide("problem", props.problem);
provide("testCases", testCases);
provide("solutionCode", solutionCode);
provide("cursorPosition", cursorPosition);
provide("isDark", isDark);
provide("monacoRef", monacoRef);
provide("editorReady", editorReady);
provide("isRunning", isRunning);
provide("showOutput", showOutput);
provide("runResults", runResults);
provide("runError", runError);
provide("runCode", runCode);
provide("submissionNumber", submissionNumber);
provide("runtimeMs", runtimeMs);
provide("submissionDate", submissionDate);
provide("setEditorInstance", setEditorInstance);
provide("setTyChecker", setTyChecker);
provide("submissionCodes", submissionCodes);
provide("openSubmission", openSubmission);
provide("moveTab", moveTab);
provide("closeTab", closeTab);
provide("splitPanel", splitPanel);
provide("updateSizesForSplit", updateSizesForSplit);
provide("resetLayout", resetLayout);

// Debounce-save solution code to server
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function debounceSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const code = solutionCode.value;
    if (code.length > 1_000_000) return;
    fetch("/api/solution", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem_id: props.problem.id, code }),
    }).catch(() => {});
  }, 1000);
}

watch(solutionCode, debounceSave);

onMounted(() => {
  loadCachedResults();
});
</script>

<template>
  <TopBar show-run />
  <ClientOnly>
    <div class="layout">
      <SplitLayout :node="layout" />
    </div>
    <template #fallback>
      <div class="layout">
        <div class="left-panel-fallback">
          <div class="problem-header">
            <h1 class="problem-title">
              {{ problem.id }}. {{ problem.name }}
            </h1>
            <span
              class="problem-difficulty"
              :class="'difficulty-' + problem.difficulty.toLowerCase()"
            >{{ problem.difficulty }}</span>
          </div>
        </div>
        <div class="right-panel-fallback">
          <div class="editor-tabs">
            <div class="editor-tab active">solution.py</div>
          </div>
          <div class="editor-container">
            <div class="editor-placeholder"></div>
          </div>
        </div>
      </div>
    </template>
  </ClientOnly>
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
  overflow: hidden;
}

/* SSR Fallback styles */
.left-panel-fallback {
  width: 35%;
  min-width: 0;
  overflow-y: auto;
  padding: 24px;
  border-right: 1px solid var(--border, #333);
  background: var(--bg2, #1a1a1a);
}
.right-panel-fallback {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg, #1e1e1e);
  min-width: 0;
}

/* Shared styles used by panel components */
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
.editor-container .monaco-editor .overflowingContentWidgets {
  z-index: 200;
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

.panel-description::-webkit-scrollbar,
.panel-output .output-body::-webkit-scrollbar {
  width: 8px;
}
.panel-description::-webkit-scrollbar-track,
.panel-output .output-body::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.panel-description::-webkit-scrollbar-thumb,
.panel-output .output-body::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}
.panel-description::-webkit-scrollbar-thumb:hover,
.panel-output .output-body::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.light-mode .panel-description::-webkit-scrollbar-track {
  background: #f0f0f0;
}
.light-mode .panel-description::-webkit-scrollbar-thumb {
  background: #c0c0c0;
}
.light-mode .panel-description::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}
.light-mode .panel-description {
  scrollbar-color: #c0c0c0 #f0f0f0;
}

.run-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 14px;
  margin-right: 4px;
  background: #007acc;
  color: #fff;
  border: none;
  cursor: pointer;
  user-select: none;
  height: 26px;
  border-radius: 3px;
}
.run-button:hover:not(:disabled) {
  background: #0098ff;
}
.run-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.output-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fg2, #ccc);
}
.output-loading .spinner {
  border-color: rgba(255, 255, 255, 0.15);
  border-top-color: var(--fg2, #ccc);
}
.output-error {
  color: #ff375f;
}
.test-result {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  flex-wrap: wrap;
}
.test-result + .test-result {
  border-top: 1px solid var(--border, #333);
}
.test-result-icon {
  font-weight: 700;
  flex-shrink: 0;
}
.test-result.passed .test-result-icon {
  color: #00b8a3;
}
.test-result.failed .test-result-icon {
  color: #ff375f;
}
.test-result-label {
  color: var(--fg2, #ccc);
  flex-shrink: 0;
}
.test-result-output {
  width: 100%;
  margin: 4px 0 0;
  padding: 8px;
  background: var(--code-bg, #262626);
  border-radius: 4px;
  font-size: 12px;
  color: var(--fg2, #ccc);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
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
}
</style>
