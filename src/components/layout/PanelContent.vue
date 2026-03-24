<script setup lang="ts">
import type { PanelTab } from "reactive-layout";
import PanelDescription from "../panels/PanelDescription.vue";
import PanelSubmissions from "../panels/PanelSubmissions.vue";
import PanelSubmissionDetail from "../panels/PanelSubmissionDetail.vue";
import PanelTestCases from "../panels/PanelTestCases.vue";
import PanelEditor from "../panels/PanelEditor.vue";
import PanelOutput from "../panels/PanelOutput.vue";

defineProps<{
  activeTab: PanelTab;
}>();
</script>

<template>
  <PanelDescription v-if="activeTab.panelType === 'description'" />
  <PanelSubmissions v-else-if="activeTab.panelType === 'submissions'" />
  <PanelTestCases v-else-if="activeTab.panelType === 'test-cases'" />
  <PanelSubmissionDetail
    v-else-if="activeTab.panelType === 'submission-detail'"
    :submission-id="Number(activeTab.id.replace('submission-', ''))"
  />
  <PanelEditor v-else-if="activeTab.panelType === 'editor'" :active-tab-id="activeTab.id" />
  <PanelOutput v-else-if="activeTab.panelType === 'output'" />
</template>
