<template>
  <header class="top-bar">
    <a href="/" class="top-bar-logo">LearnTensors</a>
  </header>
</template>

<style>
@font-face {
  font-family: 'Skarpa';
  src: url('/fonts/Skarpa-Regular.ttf') format('truetype');
  font-display: block;
}

.top-bar {
  background-color: #262626;
  height: 50px;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.top-bar-logo {
  font-family: 'Skarpa', sans-serif;
  font-size: 24px;
  color: #F5F5F5;
  letter-spacing: 2px;
  text-decoration: none;
}

/* Light mode header */
.light-mode .top-bar {
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.light-mode .top-bar-logo {
  color: #1e1e1e;
}
</style>
