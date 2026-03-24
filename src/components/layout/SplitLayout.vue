<script setup lang="ts">
import { SplitLayout } from "reactive-layout";
import type { LayoutNode } from "reactive-layout";

defineProps<{
  node: LayoutNode;
}>();
</script>

<template>
  <SplitLayout :node="node" />
</template>
