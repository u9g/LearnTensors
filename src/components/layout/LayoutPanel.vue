<script setup lang="ts">
import { ref, computed, inject } from "vue";
import type { PanelNode, PanelTab } from "../../composables/useLayout";
import PanelDescription from "../panels/PanelDescription.vue";
import PanelSubmissions from "../panels/PanelSubmissions.vue";
import PanelSubmissionDetail from "../panels/PanelSubmissionDetail.vue";
import PanelTestCases from "../panels/PanelTestCases.vue";
import PanelEditor from "../panels/PanelEditor.vue";
import PanelOutput from "../panels/PanelOutput.vue";

const props = defineProps<{
  panel: PanelNode;
}>();

const moveTab = inject<(tabId: string, from: string, to: string, idx?: number) => void>("moveTab")!;
const closeTab = inject<(tabId: string) => void>("closeTab")!;
const splitPanel = inject<(panelId: string, dir: "horizontal" | "vertical", tabId: string, pos: "before" | "after") => void>("splitPanel")!;

const activeTab = computed(() => {
  return props.panel.tabs.find((t) => t.id === props.panel.activeTabId) ?? props.panel.tabs[0];
});

function setActiveTab(tabId: string) {
  props.panel.activeTabId = tabId;
}

const icons: Record<string, string> = {
  description: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v2h6V4H5zm0 3v1h6V7H5zm0 2v1h4V9H5z"/></svg>',
  submissions: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/></svg>',
  "test-cases": '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h2v2H3V3zm4 0h6v1H7V3zM3 7h2v2H3V7zm4 0h6v1H7V7zM3 11h2v2H3v-2zm4 0h6v1H7v-1z"/></svg>',
  "submission-detail": '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 11.5L3 8l1-1 2.5 2.5L11 5l1 1-5.5 5.5z"/></svg>',
  editor: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 2l-5 5L6 4.5 2 8.5V13h11.5L14 3l-.5-1zM3 12V9.2l3-3L8.3 8.5l5-5 .2.3V12H3z"/></svg>',
  output: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v6h10V5H3zm1 1l2 2-2 2v-1l1-1-1-1V6zm4 3h3v1H8V9z"/></svg>',
};

function tabIcon(tab: PanelTab): string {
  if (tab.panelType === "submission-detail") {
    return tab.label === "Accepted"
      ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="#00b8a3"><path d="M6.5 11.5L3 8l1-1 2.5 2.5L11 5l1 1-5.5 5.5z"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 16 16" fill="#ff375f"><path d="M4.5 3.5L8 7l3.5-3.5 1 1L9 8l3.5 3.5-1 1L8 9l-3.5 3.5-1-1L7 8 3.5 4.5l1-1z"/></svg>';
  }
  if (tab.panelType === "editor" && tab.id !== "solution") {
    return '<svg width="14" height="14" viewBox="0 0 16 16" fill="#e37933"><path d="M5.1 2C3.9 2 3 2.9 3 4.1v.3c0 .8-.4 1.5-1 1.8v1.6c.6.3 1 1 1 1.8v.3C3 11.1 3.9 12 5.1 12H6v-1.5h-.9c-.3 0-.6-.3-.6-.6v-.3c0-1-.5-2-1.3-2.6.8-.6 1.3-1.5 1.3-2.6v-.3c0-.3.3-.6.6-.6H6V2H5.1zm5.8 0c1.2 0 2.1.9 2.1 2.1v.3c0 .8.4 1.5 1 1.8v1.6c-.6.3-1 1-1 1.8v.3c0 1.2-.9 2.1-2.1 2.1H10v-1.5h.9c.3 0 .6-.3.6-.6v-.3c0-1 .5-2 1.3-2.6-.8-.6-1.3-1.5-1.3-2.6v-.3c0-.3-.3-.6-.6-.6H10V2h.9z"/></svg>';
  }
  if (tab.panelType === "editor") {
    return '<svg width="14" height="14" viewBox="0 0 16 16" fill="#3572a5"><path d="M5.1 2C3.9 2 3 2.9 3 4.1v.3c0 .8-.4 1.5-1 1.8v1.6c.6.3 1 1 1 1.8v.3C3 11.1 3.9 12 5.1 12H6v-1.5h-.9c-.3 0-.6-.3-.6-.6v-.3c0-1-.5-2-1.3-2.6.8-.6 1.3-1.5 1.3-2.6v-.3c0-.3.3-.6.6-.6H6V2H5.1zm5.8 0c1.2 0 2.1.9 2.1 2.1v.3c0 .8.4 1.5 1 1.8v1.6c-.6.3-1 1-1 1.8v.3c0 1.2-.9 2.1-2.1 2.1H10v-1.5h.9c.3 0 .6-.3.6-.6v-.3c0-1 .5-2 1.3-2.6-.8-.6-1.3-1.5-1.3-2.6v-.3c0-.3-.3-.6-.6-.6H10V2h.9z"/></svg>';
  }
  return icons[tab.panelType] ?? "";
}

// --- Content drop zones (split indicators) ---
type DropZone = "left" | "right" | "top" | "bottom" | "center" | null;
const dropZone = ref<DropZone>(null);
const contentEl = ref<HTMLElement | null>(null);

function getDropZone(e: DragEvent): DropZone {
  const el = contentEl.value;
  if (!el) return "center";
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  if (x < 0.25) return "left";
  if (x > 0.75) return "right";
  if (y < 0.25) return "top";
  if (y > 0.75) return "bottom";
  return "center";
}

// --- Tab bar drop (insert between tabs with vertical line) ---
const tabDropIndex = ref<number | null>(null);
const tabBarEl = ref<HTMLElement | null>(null);

function getTabDropIndex(e: DragEvent): number {
  if (!tabBarEl.value) return props.panel.tabs.length;
  const tabEls = tabBarEl.value.querySelectorAll<HTMLElement>(".panel-tab");
  for (let i = 0; i < tabEls.length; i++) {
    const rect = tabEls[i].getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) return i;
  }
  return tabEls.length;
}

function onTabBarDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  dropZone.value = null;
  tabDropIndex.value = getTabDropIndex(e);
}

function onContentDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  tabDropIndex.value = null;
  dropZone.value = getDropZone(e);
}

function onDragLeave(e: DragEvent) {
  const related = e.relatedTarget as HTMLElement | null;
  const panelEl = (e.currentTarget as HTMLElement)?.closest(".layout-panel");
  if (panelEl && related && panelEl.contains(related)) return;
  dropZone.value = null;
  tabDropIndex.value = null;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  const data = e.dataTransfer?.getData("application/json");
  const currentDropZone = dropZone.value;
  const currentTabDropIndex = tabDropIndex.value;
  dropZone.value = null;
  tabDropIndex.value = null;

  if (!data) return;

  try {
    const { tabId, sourcePanelId } = JSON.parse(data);

    if (currentTabDropIndex !== null) {
      moveTab(tabId, sourcePanelId, props.panel.id, currentTabDropIndex);
      return;
    }

    if (!currentDropZone) return;

    if (currentDropZone === "center") {
      moveTab(tabId, sourcePanelId, props.panel.id);
    } else {
      const directionMap: Record<string, "horizontal" | "vertical"> = {
        left: "horizontal",
        right: "horizontal",
        top: "vertical",
        bottom: "vertical",
      };
      const positionMap: Record<string, "before" | "after"> = {
        left: "before",
        right: "after",
        top: "before",
        bottom: "after",
      };
      splitPanel(
        props.panel.id,
        directionMap[currentDropZone],
        tabId,
        positionMap[currentDropZone],
      );
    }
  } catch {
    // ignore
  }
}

function onTabDragStart(e: DragEvent, tabId: string) {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData(
    "application/json",
    JSON.stringify({ tabId, sourcePanelId: props.panel.id }),
  );
}

const dropIndicatorStyle = computed(() => {
  if (!dropZone.value) return null;
  const base = {
    position: "absolute" as const,
    background: "rgba(0, 122, 204, 0.15)",
    border: "2px solid rgba(0, 122, 204, 0.4)",
    pointerEvents: "none" as const,
    zIndex: 100,
  };
  switch (dropZone.value) {
    case "left":
      return { ...base, top: "0", left: "0", width: "50%", height: "100%" };
    case "right":
      return { ...base, top: "0", right: "0", width: "50%", height: "100%" };
    case "top":
      return { ...base, top: "0", left: "0", width: "100%", height: "50%" };
    case "bottom":
      return { ...base, bottom: "0", left: "0", width: "100%", height: "50%" };
    case "center":
      return { ...base, top: "0", left: "0", width: "100%", height: "100%" };
    default:
      return null;
  }
});

const tabInsertLineStyle = computed(() => {
  if (tabDropIndex.value === null || !tabBarEl.value) return null;
  const tabEls = tabBarEl.value.querySelectorAll<HTMLElement>(".panel-tab");
  let xPos: number;
  const barRect = tabBarEl.value.getBoundingClientRect();

  if (tabEls.length === 0) {
    xPos = 4;
  } else if (tabDropIndex.value >= tabEls.length) {
    const lastRect = tabEls[tabEls.length - 1].getBoundingClientRect();
    xPos = lastRect.right - barRect.left;
  } else {
    const targetRect = tabEls[tabDropIndex.value].getBoundingClientRect();
    xPos = targetRect.left - barRect.left;
  }

  return {
    position: "absolute" as const,
    left: xPos + "px",
    top: "0",
    bottom: "0",
    width: "2px",
    background: "#007acc",
    pointerEvents: "none" as const,
    zIndex: 100,
  };
});
</script>

<template>
  <div class="layout-panel">
    <div
      ref="tabBarEl"
      class="panel-tab-bar"
      @dragover="onTabBarDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div
        v-for="(tab, i) in panel.tabs"
        :key="tab.id"
        class="panel-tab"
        :class="{
          active: tab.id === panel.activeTabId,
          'before-active': panel.tabs[i + 1]?.id === panel.activeTabId,
        }"
        draggable="true"
        @click="setActiveTab(tab.id)"
        @dragstart="(e: DragEvent) => onTabDragStart(e, tab.id)"
      >
        <span class="tab-icon" v-html="tabIcon(tab)"></span>
        {{ tab.label }}
        <span
          v-if="tab.closable"
          class="tab-close"
          @click.stop="closeTab(tab.id)"
        >&times;</span>
      </div>
      <div class="tab-bar-spacer"></div>
      <div v-if="tabInsertLineStyle" :style="tabInsertLineStyle" />
    </div>
    <div
      ref="contentEl"
      class="panel-content"
      @dragover="onContentDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div v-if="dropIndicatorStyle" :style="dropIndicatorStyle" />
      <template v-if="activeTab">
        <PanelDescription
          v-if="activeTab.panelType === 'description'"
        />
        <PanelSubmissions v-else-if="activeTab.panelType === 'submissions'" />
        <PanelTestCases v-else-if="activeTab.panelType === 'test-cases'" />
        <PanelSubmissionDetail
          v-else-if="activeTab.panelType === 'submission-detail'"
          :submission-id="Number(activeTab.id.replace('submission-', ''))"
        />
        <PanelEditor v-else-if="activeTab.panelType === 'editor'" :active-tab-id="activeTab.id" />
        <PanelOutput v-else-if="activeTab.panelType === 'output'" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.layout-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
.panel-tab-bar {
  display: flex;
  align-items: stretch;
  height: 36px;
  background: var(--bg3, #252526);
  border-top: 1px solid var(--border, #333);
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}
.panel-tab {
  font-size: 13px;
  color: #888;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background: var(--bg3, #252526);
  border-top: 1px solid transparent;
  border-bottom: 1px solid var(--border, #333);
  border-right: 1px solid var(--border, #333);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.panel-tab:hover {
  color: var(--fg2, #ccc);
}
.panel-tab.active {
  color: var(--fg2, #ccc);
  background: var(--bg, #1e1e1e);
  border-top: 1px solid #007acc;
  border-bottom-color: transparent;
  border-right-color: transparent;
}
.panel-tab.before-active {
  border-right-color: transparent;
}
.tab-icon {
  display: flex;
  align-items: center;
  margin-right: 5px;
  opacity: 0.85;
}
.tab-close {
  margin-left: 6px;
  font-size: 16px;
  line-height: 1;
  color: #888;
}
.tab-close:hover {
  color: var(--fg, #fff);
}
.tab-bar-spacer {
  flex: 1;
  border-bottom: 1px solid var(--border, #333);
  align-self: stretch;
}
.panel-tab[draggable="true"] {
  cursor: grab;
}
.panel-tab[draggable="true"]:active {
  cursor: grabbing;
}
.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
</style>
