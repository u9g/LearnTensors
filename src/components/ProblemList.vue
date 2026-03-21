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
    <table class="problem-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="problem in problems" :key="problem.id">
          <td>{{ problem.id }}</td>
          <td>
            <a :href="`/problems/${problem.slug}`">{{ problem.name }}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.problem-list {
  background-color: #1a1a1a;
  min-height: calc(100vh - 50px);
  padding: 24px;
}

.problem-table {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border-collapse: collapse;
  color: #f5f5f5;
  font-family: sans-serif;
}

.problem-table th {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  color: #888;
  font-size: 14px;
}

.problem-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a2a;
}

.problem-table a {
  color: #f5f5f5;
  text-decoration: none;
}

.problem-table a:hover {
  color: #7cb3ff;
}

.problem-table tr:hover {
  background-color: #222;
}
</style>
