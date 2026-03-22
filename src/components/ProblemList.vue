<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Problem {
  id: number;
  name: string;
  slug: string;
  description: string;
  starter_code: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

const problems = ref<Problem[]>([]);
const starredIds = ref<Set<number>>(new Set());

async function toggleStar(problemId: number) {
  const isStarred = starredIds.value.has(problemId);
  const method = isStarred ? "DELETE" : "POST";

  await fetch("/api/stars", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem_id: problemId, user_id: "default-user" }),
  });

  if (isStarred) {
    starredIds.value.delete(problemId);
  } else {
    starredIds.value.add(problemId);
  }
  starredIds.value = new Set(starredIds.value);
}

onMounted(async () => {
  const [problemsRes, starsRes] = await Promise.all([
    fetch("/api/problems"),
    fetch("/api/stars?user_id=default-user"),
  ]);
  problems.value = await problemsRes.json();
  const ids: number[] = await starsRes.json();
  starredIds.value = new Set(ids);
});
</script>

<template>
  <div class="problem-list">
    <div class="problem-items">
      <div v-for="problem in problems" :key="problem.id" class="problem-row">
        <a :href="`/problem/${problem.slug}`" class="problem-link">
          {{ problem.id }}. {{ problem.name }}
        </a>
        <span class="difficulty" :class="problem.difficulty.toLowerCase()">{{ problem.difficulty }}</span>
        <button
          class="star-btn"
          :class="{ starred: starredIds.has(problem.id) }"
          @click.prevent="toggleStar(problem.id)"
        >{{ starredIds.has(problem.id) ? '&#9733;' : '&#9734;' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.problem-list {
  background-color: #1a1a1a;
  min-height: calc(100vh - 50px);
  padding: 0;
}

.problem-items {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.problem-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
}

.problem-link {
  color: #f5f5f5;
  text-decoration: none;
  flex: 1;
}

.difficulty {
  margin-right: 8px;
}

.difficulty.easy {
  color: #00b8a3;
}

.difficulty.medium {
  color: #ffc01e;
}

.difficulty.hard {
  color: #ff375f;
}

.star-btn {
  opacity: 0;
  background: none;
  border: none;
  color: #888;
  font-size: 15px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
}

.problem-row:hover .star-btn {
  opacity: 1;
}

.star-btn:hover {
  background-color: #333;
  color: #f5f5f5;
}

.star-btn.starred {
  opacity: 1;
  color: #f5c518;
}
</style>

<style>
.light-mode .problem-list {
  background-color: #fff;
}

.light-mode .problem-link {
  color: #1e1e1e;
}

.light-mode .problem-link:hover {
  color: #0969da;
}

.light-mode .difficulty.easy {
  color: #00896e;
}

.light-mode .difficulty.medium {
  color: #c59000;
}

.light-mode .difficulty.hard {
  color: #d1243b;
}

.light-mode .star-btn:hover {
  background-color: #e8e8e8;
  color: #1e1e1e;
}
</style>
