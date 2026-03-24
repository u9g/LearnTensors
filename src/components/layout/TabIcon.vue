<script setup lang="ts">
import type { PanelTab } from "reactive-layout";

defineProps<{
  tab: PanelTab;
}>();

const icons: Record<string, string> = {
  description: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v2h6V4H5zm0 3v1h6V7H5zm0 2v1h4V9H5z"/></svg>',
  submissions: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/></svg>',
  "test-cases": '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h2v2H3V3zm4 0h6v1H7V3zM3 7h2v2H3V7zm4 0h6v1H7V7zM3 11h2v2H3v-2zm4 0h6v1H7v-1z"/></svg>',
  "submission-detail": '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 11.5L3 8l1-1 2.5 2.5L11 5l1 1-5.5 5.5z"/></svg>',
  editor: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 2l-5 5L6 4.5 2 8.5V13h11.5L14 3l-.5-1zM3 12V9.2l3-3L8.3 8.5l5-5 .2.3V12H3z"/></svg>',
  output: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v6h10V5H3zm1 1l2 2-2 2v-1l1-1-1-1V6zm4 3h3v1H8V9z"/></svg>',
};

function getIcon(tab: PanelTab): string {
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
</script>

<template>
  <span class="tab-icon" v-html="getIcon(tab)"></span>
</template>

<style scoped>
.tab-icon {
  display: flex;
  align-items: center;
  margin-right: 5px;
  opacity: 0.85;
}
</style>
