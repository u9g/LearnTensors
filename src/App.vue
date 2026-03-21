<script setup lang="ts">
import ProblemList from "./components/ProblemList.vue";
</script>

<template>
  <header class="top-bar">
    <span class="top-bar-logo">LearnTensors</span>
  </header>
  <ProblemList />
</template>

<style scoped>
.top-bar {
  background-color: #262626;
  height: 50px;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.top-bar-logo {
  font-family: 'Skarpa', sans-serif;
  font-size: 24px;
  color: #F5F5F5;
  letter-spacing: 2px;
}
</style>
