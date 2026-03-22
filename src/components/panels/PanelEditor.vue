<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, watch, type Ref } from "vue";
import {
  darkModernTheme,
  lightModernTheme,
  enhancePythonTokenizer,
} from "../../composables/darkModernTheme";

const props = defineProps<{
  activeTabId: string;
}>();

const problem = inject<any>("problem")!;
const solutionCode = inject<Ref<string>>("solutionCode")!;
const cursorPosition = inject<Ref<{ lineNumber: number; column: number } | null>>("cursorPosition")!;
const isDark = inject<Ref<boolean>>("isDark")!;
const monacoRef = inject<Ref<any>>("monacoRef")!;
const editorReady = inject<Ref<boolean>>("editorReady")!;
const setEditorInstance = inject<(editor: any) => void>("setEditorInstance")!;
const setTyChecker = inject<(checker: any) => void>("setTyChecker")!;
const submissionCodes = inject<Record<string, string>>("submissionCodes", {});

const monacoPromise =
  typeof window !== "undefined" ? import("monaco-editor") : null;
const workerPromise =
  typeof window !== "undefined"
    ? import("monaco-editor/esm/vs/editor/editor.worker?worker")
    : null;
const tyPromise =
  typeof window !== "undefined"
    ? import("../../composables/useTyChecker")
    : null;

const editorEl = ref<HTMLElement | null>(null);
let editorInstance: any = null;
let tyChecker: import("../../composables/useTyChecker").TyChecker | null = null;
let currentTabId = "solution";

function forceTokenizeAll(
  editor: import("monaco-editor").editor.IStandaloneCodeEditor,
) {
  const model = editor.getModel() as any;
  if (model?.tokenization?.forceTokenization) {
    model.tokenization.forceTokenization(model.getLineCount());
  }
}

function applyTab(tabId: string) {
  if (!editorInstance) return;
  if (currentTabId === "solution") {
    solutionCode.value = editorInstance.getValue();
    tyChecker?.updateSolution(solutionCode.value);
  }
  currentTabId = tabId;
  if (tabId === "solution") {
    tyChecker?.switchFile("solution.py", solutionCode.value);
    editorInstance.setValue(solutionCode.value);
    editorInstance.updateOptions({ readOnly: false });
  } else if (tabId.startsWith("submission-")) {
    const code = submissionCodes[tabId] ?? "";
    editorInstance.setValue(code);
    editorInstance.updateOptions({ readOnly: true });
  } else if (tabId === "test-harness") {
    const harness = problem.test_harness ?? "";
    tyChecker?.switchFile("test_harness.py", harness);
    editorInstance.setValue(harness);
    editorInstance.updateOptions({ readOnly: true });
  } else {
    const idx = parseInt(tabId.split("-")[1]) - 1;
    const tc = problem.test_cases[idx];
    tyChecker?.switchFile(`test_${idx + 1}.py`, tc.input);
    editorInstance.setValue(tc.input);
    editorInstance.updateOptions({ readOnly: true });
  }
  forceTokenizeAll(editorInstance);
}

watch(() => props.activeTabId, (newId) => {
  if (newId !== currentTabId) applyTab(newId);
});

onMounted(async () => {
  if (!monacoPromise || !workerPromise) return;

  const [monaco, editorWorker] = await Promise.all([
    monacoPromise,
    workerPromise,
  ]);

  // Load saved solution code before creating editor
  try {
    const res = await fetch(`/api/solution?problem_id=${problem.id}`);
    const data = await res.json();
    if (data.code !== null && data.code !== undefined) {
      solutionCode.value = data.code;
    }
  } catch {
    // Use starter code as fallback
  }

  monacoRef.value = monaco;
  self.MonacoEnvironment = {
    getWorker: () => new editorWorker.default(),
  };

  monaco.editor.defineTheme("learntensors-dark", darkModernTheme as any);
  monaco.editor.defineTheme("learntensors-light", lightModernTheme as any);
  enhancePythonTokenizer(monaco);

  if (!editorEl.value) return;

  editorReady.value = true;
  const editor = monaco.editor.create(editorEl.value, {
    value: solutionCode.value,
    language: "python",
    theme: isDark.value ? "learntensors-dark" : "learntensors-light",
    fontSize: 14,
    minimap: { enabled: false },
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { useShadows: false },
    scrollBeyondLastLine: false,
    padding: { top: 12 },
    automaticLayout: true,
    tabSize: 4,
    renderLineHighlight: "line",
    cursorBlinking: "smooth",
    smoothScrolling: true,
    "semanticHighlighting.enabled": true,
  });
  editorInstance = editor;
  setEditorInstance(editor);

  editor.onDidChangeModelContent(() => {
    if (currentTabId === "solution") {
      solutionCode.value = editor.getValue();
    }
  });

  if (props.activeTabId !== "solution") {
    applyTab(props.activeTabId);
  }
  forceTokenizeAll(editor);

  if (cursorPosition.value) {
    editor.setPosition(cursorPosition.value);
    editor.revealPositionInCenter(cursorPosition.value);
  }

  void (async () => {
    try {
      const tyModule = await tyPromise!;
      tyChecker = await tyModule.initTyChecker(
        monaco,
        editor,
        solutionCode.value,
      );
      setTyChecker(tyChecker);
    } catch (e) {
      console.warn("ty type checker failed to load:", e);
    }
  })();
});

onUnmounted(() => {
  if (editorInstance) {
    if (currentTabId === "solution") {
      solutionCode.value = editorInstance.getValue();
    }
    const pos = editorInstance.getPosition();
    if (pos) cursorPosition.value = { lineNumber: pos.lineNumber, column: pos.column };
    editorInstance.dispose();
    editorInstance = null;
    setEditorInstance(null);
  }
  if (tyChecker) {
    tyChecker.dispose();
    tyChecker = null;
    setTyChecker(null);
  }
});
</script>

<template>
  <div class="panel-editor">
    <div class="editor-container">
      <div v-if="!editorReady" class="editor-placeholder"></div>
      <div
        ref="editorEl"
        style="width: 100%; height: 100%; position: absolute; top: 0; left: 0"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.panel-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg, #1e1e1e);
  min-width: 0;
}
.editor-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
</style>
