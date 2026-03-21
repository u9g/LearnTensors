<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Problem {
  id: number;
  name: string;
  slug: string;
  description: string;
  starter_code: string;
}

const problems = ref<Problem[]>([]);

onMounted(async () => {
  const res = await fetch("/api/problems");
  problems.value = await res.json();
});
</script>

<template>
  <div class="problem-list">
    <div class="problem-items">
      <div v-for="problem in problems" :key="problem.id" class="problem-row">
        <a :href="`/problems/${problem.slug}`" class="problem-link">
          {{ problem.id }}. {{ problem.name }}
        </a>
        <button class="star-btn" @click.prevent>&#9734;</button>
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
  font-family: sans-serif;
}

.problem-link {
  color: #f5f5f5;
  text-decoration: none;
  flex: 1;
}

.star-btn {
  opacity: 0;
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
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
</style>
