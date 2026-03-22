<script setup lang="ts">
import { ref, computed, inject, onMounted, watch, type Ref } from "vue";

interface Submission {
  id: number;
  submission_number: number;
  passed: number;
  total: number;
  allPassed: boolean;
  solution_code: string;
  created_at: string;
  runtime_ms: number | null;
}

const problem = inject<any>("problem")!;
const isRunning = inject<Ref<boolean>>("isRunning")!;
const openSubmission = inject<(id: number, code: string, submissionNumber?: number) => void>("openSubmission")!

const submissions = ref<Submission[]>([]);
const loading = ref(true);

type SortKey = "submission_number" | "status" | "tests" | "runtime";
const sortBy = ref<SortKey>("submission_number");
const sortDir = ref<"asc" | "desc">("desc");

function toggleSort(key: SortKey) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = key;
    sortDir.value = key === "submission_number" ? "desc" : "asc";
  }
}

const sorted = computed(() => {
  const list = [...submissions.value];
  const dir = sortDir.value === "asc" ? 1 : -1;
  list.sort((a, b) => {
    switch (sortBy.value) {
      case "submission_number":
        return (a.submission_number - b.submission_number) * dir;
      case "status":
        return ((a.allPassed ? 1 : 0) - (b.allPassed ? 1 : 0)) * dir;
      case "tests":
        return (a.passed / (a.total || 1) - b.passed / (b.total || 1)) * dir;
      case "runtime":
        return ((a.runtime_ms ?? Infinity) - (b.runtime_ms ?? Infinity)) * dir;
      default:
        return 0;
    }
  });
  return list;
});

async function fetchSubmissions() {
  loading.value = true;
  try {
    const res = await fetch(`/api/submissions?problem_id=${problem.id}`);
    const data = await res.json();
    submissions.value = data.submissions ?? [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso + "Z");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso + "Z");
  return d.toLocaleDateString(undefined, {
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

function sortIndicator(key: SortKey): string {
  if (sortBy.value !== key) return "";
  return sortDir.value === "asc" ? " ▲" : " ▼";
}

onMounted(fetchSubmissions);

watch(isRunning, (val, old) => {
  if (!val && old) fetchSubmissions();
});
</script>

<template>
  <div class="panel-submissions">
    <div v-if="loading && submissions.length === 0" class="submissions-empty">
      Loading...
    </div>
    <div v-else-if="submissions.length === 0" class="submissions-empty">
      No submissions yet. Run your code to create one.
    </div>
    <table v-else class="submissions-table">
      <thead>
        <tr>
          <th class="col-num" @click="toggleSort('submission_number')">#{{ sortIndicator("submission_number") }}</th>
          <th class="col-status" @click="toggleSort('status')">Status{{ sortIndicator("status") }}</th>
          <th class="col-tests" @click="toggleSort('tests')">Tests{{ sortIndicator("tests") }}</th>
          <th class="col-runtime" @click="toggleSort('runtime')">Runtime{{ sortIndicator("runtime") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="sub in sorted"
          :key="sub.id"
          @click="openSubmission(sub.id, sub.solution_code, sub.submission_number)"
        >
          <td class="col-num">{{ sub.submission_number }}</td>
          <td class="col-status">
            <span
              class="status-label"
              :class="sub.allPassed ? 'passed' : 'failed'"
            >{{ sub.allPassed ? "Accepted" : "Failed" }}</span>
            <span class="status-date" :title="formatDateTime(sub.created_at)">{{ formatDate(sub.created_at) }}</span>
          </td>
          <td class="col-tests">{{ sub.passed }}/{{ sub.total }}</td>
          <td class="col-runtime">{{ formatRuntime(sub.runtime_ms) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.panel-submissions {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg2, #1a1a1a);
}

.submissions-empty {
  color: #888;
  font-size: 14px;
}

.submissions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.submissions-table th {
  text-align: left;
  color: #888;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #333);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.submissions-table th:hover {
  color: var(--fg2, #ccc);
}

.submissions-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, #333);
}

.submissions-table tbody tr {
  cursor: pointer;
}

.submissions-table tbody tr:hover {
  background: var(--bg3, #252526);
}

.col-num {
  width: 50px;
  color: #888;
  font-size: 13px;
}

.col-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

th.col-status {
  display: table-cell;
}

.status-label {
  font-weight: 600;
}

.status-label.passed {
  color: #00b8a3;
}

.status-label.failed {
  color: #ff375f;
}

.status-date {
  color: #888;
  font-size: 12px;
}

.col-tests {
  color: var(--fg2, #ccc);
}

.col-runtime {
  text-align: right;
  color: #888;
  font-size: 13px;
}
</style>
