<script setup lang="ts">
import { inject, type Ref } from "vue";

const isRunning = inject<Ref<boolean>>("isRunning")!;
const runResults = inject<
  Ref<Array<{ test_id: number; passed: boolean; output: string; error: string }>>
>("runResults")!;
const runError = inject<Ref<string | null>>("runError")!;
</script>

<template>
  <div class="panel-output">
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
</style>
