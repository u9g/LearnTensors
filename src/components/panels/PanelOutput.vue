<script setup lang="ts">
import { inject, computed, type Ref } from "vue";

const isRunning = inject<Ref<boolean>>("isRunning")!;
const runResults = inject<
  Ref<Array<{ test_id: number; passed: boolean; output: string; error: string }>>
>("runResults")!;
const runError = inject<Ref<string | null>>("runError")!;
const submissionNumber = inject<Ref<number | null>>("submissionNumber")!;
const runtimeMs = inject<Ref<number | null>>("runtimeMs")!;
const submissionDate = inject<Ref<string | null>>("submissionDate")!;

const formattedRuntime = computed(() => {
  if (runtimeMs.value == null) return null;
  if (runtimeMs.value < 1000) return `${runtimeMs.value}ms`;
  return `${(runtimeMs.value / 1000).toFixed(1)}s`;
});

const relativeDate = computed(() => {
  if (!submissionDate.value) return null;
  const d = new Date(submissionDate.value);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
});

const fullDate = computed(() => {
  if (!submissionDate.value) return "";
  const d = new Date(submissionDate.value);
  return d.toLocaleString();
});
</script>

<template>
  <div class="panel-output">
    <div v-if="submissionNumber != null && !isRunning" class="output-meta">
      <span class="meta-item">Submission #{{ submissionNumber }}</span>
      <span class="meta-spacer"></span>
      <span v-if="formattedRuntime" class="meta-item">{{ formattedRuntime }}</span>
    </div>
    <div class="output-body">
      <div v-if="isRunning" class="output-loading">
        <span class="spinner"></span> Running tests...
      </div>
      <div v-else-if="runError" class="output-error">{{ runError }}</div>
      <div v-else-if="runResults.length === 0" class="output-empty">
        Click Run to execute your solution
      </div>
      <template v-else>
        <div
          v-for="r in runResults"
          :key="r.test_id"
          class="test-result"
          :class="r.passed ? 'passed' : 'failed'"
        >
          <span class="test-result-icon">{{
            r.passed ? "\u2713" : "\u2717"
          }}</span>
          <span class="test-result-label">Test {{ r.test_id }}</span>
          <pre
            v-if="r.output || r.error"
            class="test-result-output"
          >{{ r.output || r.error }}</pre>
        </div>
        <div v-if="relativeDate" class="output-date" :title="fullDate">{{ relativeDate }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.panel-output {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg2, #1a1a1a);
}
.output-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #333);
  font-size: 12px;
  color: #888;
  flex-shrink: 0;
}
.meta-item {
  white-space: nowrap;
}
.meta-spacer {
  flex: 1;
}
.output-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace;
  font-size: 13px;
}
.output-empty {
  color: #888;
  font-style: italic;
}
.output-date {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border, #333);
  font-size: 12px;
  color: #888;
  cursor: default;
}
</style>
