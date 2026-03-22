<script setup lang="ts">
import { computed, inject, ref, onMounted, watch, type Ref } from "vue";
import { marked } from "marked";

interface TestCase {
  id: number;
  input: string;
  expected_output: string;
}

interface Problem {
  id: number;
  name: string;
  slug: string;
  description: string;
  starter_code: string;
  difficulty: "Easy" | "Medium" | "Hard";
  test_cases: TestCase[];
}

const problem = inject<Problem>("problem")!;
const monacoRef = inject<Ref<any>>("monacoRef")!;
const isDark = inject<Ref<boolean>>("isDark")!;

const descriptionEl = ref<HTMLElement | null>(null);

const difficultyClass = computed(
  () => "difficulty-" + problem.difficulty.toLowerCase(),
);

const renderedDescription = computed(() => {
  return marked.parse(problem.description) as string;
});

async function colorizeCodeBlocks() {
  const monaco = monacoRef.value;
  if (!monaco || !descriptionEl.value) return;
  const codeEls =
    descriptionEl.value.querySelectorAll<HTMLElement>("pre code");
  for (const el of codeEls) {
    const lang = el.className.match(/language-(\w+)/)?.[1] || "python";
    el.setAttribute("data-lang", lang);
    el.textContent = el.textContent?.replace(/\n$/, "") ?? "";
    await monaco.editor.colorizeElement(el, {
      theme: isDark.value ? "learntensors-dark" : "learntensors-light",
    });
  }
}

onMounted(() => {
  colorizeCodeBlocks();
});

watch(monacoRef, () => {
  colorizeCodeBlocks();
});
</script>

<template>
  <div ref="descriptionEl" class="panel-description">
    <div class="problem-header">
      <h1 class="problem-title">{{ problem.id }}. {{ problem.name }}</h1>
      <span class="problem-difficulty" :class="difficultyClass">{{
        problem.difficulty
      }}</span>
    </div>
    <div class="problem-description" v-html="renderedDescription"></div>
  </div>
</template>

<style scoped>
.panel-description {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg2, #1a1a1a);
}
</style>
