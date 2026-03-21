<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { marked } from "marked";
import TopBar from "./TopBar.vue";

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

const props = defineProps<{ problem: Problem }>();

const difficultyClass = computed(
  () => "difficulty-" + props.problem.difficulty.toLowerCase()
);

const renderedDescription = computed(() => {
  return marked.parse(props.problem.description) as string;
});

const editorEl = ref<HTMLElement | null>(null);
const editorReady = ref(false);
let tyCleanup: (() => void) | null = null;

onMounted(() => {
  const req = (window as any).require;
  if (!req) return;

  req.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
    },
  });
  req(["vs/editor/editor.main"], async (monaco: any) => {
    monaco.editor.defineTheme("learntensors", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: { "editor.background": "#1e1e1e" },
    });
    if (editorEl.value) {
      editorReady.value = true;
      const editor = monaco.editor.create(editorEl.value, {
        value: props.problem.starter_code,
        language: "python",
        theme: "learntensors",
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        smoothScrolling: true,
        "semanticHighlighting.enabled": true,
        acceptSuggestionOnEnter: "off",
      });

      // Workaround: Monaco CDN/AMD load may not register Enter as a type command.
      // Explicitly bind Enter to insert a newline.
      editor.addCommand(monaco.KeyCode.Enter, () => {
        editor.trigger("keyboard", "type", { text: "\n" });
      });

      // Initialize ty type checker (WASM) for diagnostics, hover, completions, etc.
      try {
        const { initTyChecker } = await import(
          "../composables/useTyChecker"
        );
        tyCleanup = await initTyChecker(
          monaco,
          editor,
          props.problem.starter_code,
        );
      } catch (e) {
        console.warn("ty type checker failed to load:", e);
      }
    }
  });
});

onUnmounted(() => {
  tyCleanup?.();
});
</script>

<template>
  <TopBar />
  <div class="layout">
    <div class="left-panel">
      <div class="problem-header">
        <h1 class="problem-title">
          {{ problem.id }}. {{ problem.name }}
        </h1>
        <span class="problem-difficulty" :class="difficultyClass">{{
          problem.difficulty
        }}</span>
      </div>
      <div class="problem-description" v-html="renderedDescription"></div>
      <div v-if="problem.test_cases.length > 0" class="test-cases">
        <div class="section-label">Test Cases</div>
        <div
          v-for="(tc, i) in problem.test_cases"
          :key="tc.id"
          class="test-case"
        >
          <div class="test-case-label">Test {{ i + 1 }} — Input</div>
          <pre><code>{{ tc.input }}</code></pre>
          <div class="test-case-label" style="margin-top: 8px">
            Expected Output
          </div>
          <pre><code>{{ tc.expected_output }}</code></pre>
        </div>
      </div>
    </div>
    <div class="right-panel">
      <div class="editor-tabs">
        <div class="editor-tab">solution.py</div>
      </div>
      <div class="editor-container">
        <pre v-if="!editorReady" class="editor-placeholder"><code>{{ problem.starter_code }}</code></pre>
        <div ref="editorEl" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;"></div>
      </div>
    </div>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1e1e1e; color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; overflow: hidden; height: 100vh; }
.layout { display: flex; height: calc(100vh - 50px); }
.left-panel { width: 40%; min-width: 0; overflow-y: auto; padding: 24px; border-right: 1px solid #333; background: #1a1a1a; }
.right-panel { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; min-width: 0; }
.editor-tabs { display: flex; align-items: center; height: 36px; background: #252526; border-bottom: 1px solid #333; padding: 0 8px; flex-shrink: 0; }
.editor-tab { font-size: 13px; color: #ccc; padding: 6px 12px; background: #1e1e1e; border-top: 1px solid #007acc; border-radius: 0; }
.editor-container { flex: 1; min-height: 0; position: relative; }
.editor-placeholder { margin: 0; padding: 12px 0 0 64px; font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace; font-size: 14px; color: #d4d4d4; background: #1e1e1e; height: 100%; overflow: hidden; white-space: pre; }
.editor-placeholder code { font: inherit; color: inherit; }
.problem-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.problem-title { font-size: 20px; font-weight: 600; }
.difficulty-easy { color: #00b8a3; }
.difficulty-medium { color: #ffc01e; }
.difficulty-hard { color: #ff375f; }
.problem-difficulty { font-size: 14px; }
.problem-description { font-size: 14px; line-height: 1.7; color: #ccc; word-break: break-word; }
.problem-description h2 { font-size: 16px; font-weight: 600; color: #f5f5f5; margin: 20px 0 8px; }
.problem-description h3 { font-size: 15px; font-weight: 600; color: #f5f5f5; margin: 16px 0 6px; }
.problem-description p { margin: 8px 0; }
.problem-description code { font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace; font-size: 13px; background: #2a2a2a; padding: 2px 5px; border-radius: 3px; color: #e0e0e0; }
.problem-description pre { background: #262626; border-radius: 6px; padding: 12px 14px; overflow-x: auto; margin: 8px 0; }
.problem-description pre code { background: none; padding: 0; font-size: 13px; color: #e0e0e0; }
.problem-description ul, .problem-description ol { padding-left: 20px; margin: 8px 0; }
.problem-description li { margin: 4px 0; }
.problem-description strong { color: #f5f5f5; }
.test-cases { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
.section-label { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #f5f5f5; }
.test-case { background: #262626; border-radius: 6px; padding: 12px 14px; overflow-x: auto; }
.test-case-label { color: #888; margin-bottom: 4px; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
.test-case pre { background: none; margin: 4px 0; padding: 0; border-radius: 0; }
.test-case code { font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace; font-size: 13px; color: #e0e0e0; white-space: pre-wrap; word-break: break-word; }

.left-panel::-webkit-scrollbar { width: 8px; }
.left-panel::-webkit-scrollbar-track { background: #1a1a1a; }
.left-panel::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
.left-panel::-webkit-scrollbar-thumb:hover { background: #777; }

@media (max-width: 768px) {
  body { overflow: auto; height: auto; }
  .layout { flex-direction: column; height: auto; }
  .left-panel { width: 100%; border-right: none; border-bottom: 1px solid #333; padding: 16px; }
  .right-panel { height: 60vh; min-height: 300px; }
  .problem-title { font-size: 18px; }
}

@media (max-width: 480px) {
  .top-bar-logo { font-size: 18px; }
  .left-panel { padding: 12px; }
  .problem-title { font-size: 16px; }
  .problem-description { font-size: 13px; }
}
</style>
