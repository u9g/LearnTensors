<script setup lang="ts">
import { inject, type Ref } from "vue";

interface TestCase {
  id: number;
  input: string;
  expected_output: string;
}

const testCases = inject<Ref<TestCase[]>>("testCases")!;

let nextId = 1000;

function addTestCase() {
  testCases.value = [
    ...testCases.value,
    { id: nextId++, input: "", expected_output: "" },
  ];
}

function removeTestCase(index: number) {
  testCases.value = testCases.value.filter((_, i) => i !== index);
}

function updateInput(index: number, value: string) {
  testCases.value[index].input = value;
}
</script>

<template>
  <div class="panel-test-cases">
    <div class="test-cases-header">
      <span class="header-label">Test Cases</span>
      <button class="add-btn" @click="addTestCase">+ Add</button>
    </div>
    <div class="test-cases-list">
      <div
        v-for="(tc, i) in testCases"
        :key="tc.id"
        class="test-case-row"
      >
        <span class="test-case-num">{{ i + 1 }}</span>
        <input
          class="test-case-input"
          :value="tc.input"
          placeholder="arg1, arg2, ..., expected"
          spellcheck="false"
          @input="updateInput(i, ($event.target as HTMLInputElement).value)"
        />
        <button
          class="remove-btn"
          title="Remove test case"
          @click="removeTestCase(i)"
        >&times;</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-test-cases {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg2, #1a1a1a);
}

.test-cases-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #333);
  flex-shrink: 0;
}

.header-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg2, #ccc);
}

.add-btn {
  font-size: 12px;
  padding: 3px 10px;
  background: #007acc;
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.add-btn:hover {
  background: #0098ff;
}

.test-cases-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.test-case-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
}

.test-case-num {
  color: #888;
  font-size: 12px;
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
}

.test-case-input {
  flex: 1;
  font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace;
  font-size: 13px;
  padding: 6px 10px;
  background: var(--code-bg, #262626);
  color: var(--fg2, #ccc);
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  outline: none;
}

.test-case-input:focus {
  border-color: #007acc;
}

.test-case-input::placeholder {
  color: #555;
}

.remove-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 3px;
  opacity: 0;
}

.test-case-row:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: #ff375f;
  background: rgba(255, 55, 95, 0.1);
}
</style>
