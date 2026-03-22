<script setup lang="ts">
const posts = [
  {
    slug: "blog-code-block-colorization",
    title: "Getting VS Code-Quality Syntax Highlighting in Blog Code Blocks",
    date: "March 22, 2026",
  },
  {
    slug: "monaco-hover-syntax-highlighting",
    title: "Syntax-Highlighted Hover Tooltips in Monaco Editor",
    date: "March 22, 2026",
  },
];
</script>

<template>
  <div class="blog">
    <div class="blog-content">
      <h1 class="blog-heading">Engineering Blog</h1>
      <div v-for="post in posts" :key="post.slug" class="post-item">
        <span class="post-date">{{ post.date }}</span>
        <a :href="`/blog/${post.slug}`" class="post-title">{{ post.title }}</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blog {
  background-color: #1a1a1a;
  min-height: calc(100vh - 50px);
  padding: 0;
}

.blog-content {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.blog-heading {
  color: #f5f5f5;
  font-size: 24px;
  margin-bottom: 24px;
}

.post-item {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  border-bottom: 1px solid #333;
}

.post-date {
  color: #888;
  font-size: 13px;
}

.post-title {
  color: #f5f5f5;
  text-decoration: none;
  font-size: 16px;
  margin-top: 2px;
}

.post-title:hover {
  color: #58a6ff;
}
</style>
