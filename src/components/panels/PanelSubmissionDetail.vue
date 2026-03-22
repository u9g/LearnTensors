<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, nextTick, type Ref } from "vue";
import {
  darkModernTheme,
  lightModernTheme,
  enhancePythonTokenizer,
} from "../../composables/darkModernTheme";

interface TestResult {
  test_id: number;
  passed: boolean;
  output: string;
  error: string;
}

interface SubmissionDetail {
  id: number;
  submission_number: number;
  solution_code: string;
  created_at: string;
  runtime_ms: number | null;
  peak_memory_kb: number | null;
  passed: number;
  total: number;
  allPassed: boolean;
  test_results: TestResult[];
}

const props = defineProps<{
  submissionId: number;
}>();

const isDark = inject<Ref<boolean>>("isDark")!;

const detail = ref<SubmissionDetail | null>(null);
const loading = ref(true);
const expandedTests = ref<Set<number>>(new Set());
const codeEditorEl = ref<HTMLElement | null>(null);
let codeEditor: any = null;

const monacoPromise =
  typeof window !== "undefined" ? import("monaco-editor") : null;

async function createCodeEditor() {
  if (!monacoPromise || !codeEditorEl.value || !detail.value) return;
  const monaco = await monacoPromise;

  if (!monaco.editor.defineTheme) return;
  monaco.editor.defineTheme("learntensors-dark", darkModernTheme as any);
  monaco.editor.defineTheme("learntensors-light", lightModernTheme as any);
  enhancePythonTokenizer(monaco);

  if (codeEditor) {
    codeEditor.dispose();
    codeEditor = null;
  }

  const lineCount = detail.value.solution_code.split("\n").length;

  codeEditor = monaco.editor.create(codeEditorEl.value, {
    value: detail.value.solution_code,
    language: "python",
    theme: isDark.value ? "learntensors-dark" : "learntensors-light",
    fontSize: 14,
    readOnly: true,
    minimap: { enabled: false },
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { useShadows: false, vertical: "hidden", horizontal: "auto" },
    scrollBeyondLastLine: false,
    padding: { top: 12 },
    lineNumbers: "on",
    renderLineHighlight: "none",
    domReadOnly: true,
    cursorStyle: "line-thin",
    "semanticHighlighting.enabled": true,
  });

  // Size the editor to fit its content
  const lineHeight = codeEditor.getOption(monaco.editor.EditorOption.lineHeight);
  const height = lineCount * lineHeight + 24;
  codeEditorEl.value.style.height = `${height}px`;
  codeEditor.layout();
}

async function fetchDetail() {
  loading.value = true;
  try {
    const res = await fetch(`/api/submissions?id=${props.submissionId}`);
    if (res.ok) {
      detail.value = await res.json();
    }
  } catch {
    // ignore
  } finally {
    loading.value = false;
    await nextTick();
    createCodeEditor();
  }
}

function toggleTest(testId: number) {
  if (expandedTests.value.has(testId)) {
    expandedTests.value.delete(testId);
  } else {
    expandedTests.value.add(testId);
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso + "Z");
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRuntime(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatMemory(kb: number | null): string {
  if (kb === null) return "—";
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const passRate = computed(() => {
  if (!detail.value) return 0;
  return Math.round((detail.value.passed / detail.value.total) * 100);
});

onMounted(fetchDetail);
watch(() => props.submissionId, fetchDetail);
onUnmounted(() => {
  if (codeEditor) {
    codeEditor.dispose();
    codeEditor = null;
  }
});
</script>

<template>
  <div class="submission-detail">
    <div v-if="loading" class="detail-loading">Loading submission...</div>
    <template v-else-if="detail">
      <div class="detail-header">
        <div class="header-top">
          <span class="header-number">Submission {{ detail.submission_number }}</span>
          <span
            class="header-status"
            :class="detail.allPassed ? 'passed' : 'failed'"
          >{{ detail.allPassed ? "Accepted" : "Failed" }}</span>
        </div>
        <div class="header-stats">
          <div class="stat">
            <span class="stat-value">{{ detail.passed }}/{{ detail.total }}</span>
            <span class="stat-label">tests passed</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ formatRuntime(detail.runtime_ms) }}</span>
            <span class="stat-label">runtime</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ formatMemory(detail.peak_memory_kb) }}</span>
            <span class="stat-label">memory</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ formatDateTime(detail.created_at) }}</span>
            <span class="stat-label">submitted</span>
          </div>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :class="detail.allPassed ? 'passed' : 'failed'"
            :style="{ width: passRate + '%' }"
          ></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-title">Test Results</div>
        <div class="test-list">
          <div
            v-for="(r, i) in detail.test_results"
            :key="r.test_id"
            class="test-item"
            :class="{ expanded: expandedTests.has(r.test_id) }"
          >
            <div class="test-header" @click="toggleTest(r.test_id)">
              <span class="test-icon" :class="r.passed ? 'passed' : 'failed'">{{
                r.passed ? "\u2713" : "\u2717"
              }}</span>
              <span class="test-name">Test {{ i + 1 }}</span>
              <span class="test-chevron">{{ expandedTests.has(r.test_id) ? "\u25BE" : "\u25B8" }}</span>
            </div>
            <div v-if="expandedTests.has(r.test_id)" class="test-output">
              <pre v-if="r.output">{{ r.output }}</pre>
              <pre v-if="r.error" class="error-text">{{ r.error }}</pre>
              <span v-if="!r.output && !r.error" class="no-output">No output</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-title">Solution Code</div>
        <div ref="codeEditorEl" class="code-editor"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.submission-detail {
  height: 100%;
  overflow-y: auto;
  background: var(--bg2, #1a1a1a);
}

.detail-loading {
  padding: 24px;
  color: #888;
  font-size: 14px;
}

.detail-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #333);
}

.header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.header-number {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #f5f5f5);
}

.header-status {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
}

.header-status.passed {
  color: #00b8a3;
  background: rgba(0, 184, 163, 0.12);
}

.header-status.failed {
  color: #ff375f;
  background: rgba(255, 55, 95, 0.12);
}

.header-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 14px;
  color: var(--fg2, #ccc);
  font-weight: 500;
}

.stat-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-bar {
  height: 4px;
  background: var(--bg3, #252526);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-fill.passed {
  background: #00b8a3;
}

.progress-fill.failed {
  background: #ff375f;
}

.detail-section {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border, #333);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.test-list {
  display: flex;
  flex-direction: column;
}

.test-item {
  border: 1px solid var(--border, #333);
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.test-header:hover {
  background: var(--bg3, #252526);
}

.test-icon {
  font-weight: 700;
  font-size: 14px;
}

.test-icon.passed {
  color: #00b8a3;
}

.test-icon.failed {
  color: #ff375f;
}

.test-name {
  color: var(--fg2, #ccc);
  font-size: 13px;
}

.test-chevron {
  margin-left: auto;
  color: #888;
  font-size: 12px;
}

.test-output {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--border, #333);
  background: var(--code-bg, #262626);
}

.test-output pre {
  font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--fg2, #ccc);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.test-output .error-text {
  color: #ff375f;
}

.no-output {
  color: #666;
  font-size: 12px;
  font-style: italic;
}

.code-editor {
  border-radius: 6px;
  overflow: hidden;
}
</style>
