import { ref, watch } from "vue";

export type PanelType = "description" | "submissions" | "submission-detail" | "test-cases" | "editor" | "output";

export interface PanelTab {
  id: string;
  panelType: PanelType;
  label: string;
  closable?: boolean;
}

export interface PanelNode {
  type: "panel";
  id: string;
  tabs: PanelTab[];
  activeTabId: string;
}

export interface SplitNode {
  type: "split";
  direction: "horizontal" | "vertical";
  children: LayoutNode[];
  sizes: number[];
}

export type LayoutNode = SplitNode | PanelNode;

let nextPanelId = 1;
function genPanelId(): string {
  return `panel-${nextPanelId++}`;
}

function createDefaultLayout(testCaseCount: number): SplitNode {
  const editorTabs: PanelTab[] = [
    { id: "solution", panelType: "editor", label: "solution.py" },
  ];
  for (let i = 0; i < testCaseCount; i++) {
    editorTabs.push({
      id: `test-${i + 1}`,
      panelType: "editor",
      label: `test_${i + 1}.py`,
    });
  }

  return {
    type: "split",
    direction: "horizontal",
    children: [
      {
        type: "panel",
        id: "left",
        tabs: [
          { id: "desc", panelType: "description", label: "Description" },
          { id: "submissions", panelType: "submissions", label: "Submissions" },
        ],
        activeTabId: "desc",
      },
      {
        type: "split",
        direction: "vertical",
        children: [
          {
            type: "panel",
            id: "editor",
            tabs: editorTabs,
            activeTabId: "solution",
          },
          {
            type: "panel",
            id: "output",
            tabs: [{ id: "output", panelType: "output", label: "Output" }],
            activeTabId: "output",
          },
        ],
        sizes: [70, 30],
      },
    ],
    sizes: [35, 65],
  };
}

function findPanelById(
  node: LayoutNode,
  id: string,
): PanelNode | null {
  if (node.type === "panel") return node.id === id ? node : null;
  for (const child of node.children) {
    const found = findPanelById(child, id);
    if (found) return found;
  }
  return null;
}

function findParent(
  root: SplitNode,
  targetId: string,
): { parent: SplitNode; index: number } | null {
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.type === "panel" && child.id === targetId) {
      return { parent: root, index: i };
    }
    if (child.type === "split") {
      // Check if this split itself is the target (by checking children)
      const result = findParent(child, targetId);
      if (result) return result;
    }
  }
  return null;
}

function findTabOwner(
  node: LayoutNode,
  tabId: string,
): PanelNode | null {
  if (node.type === "panel") {
    return node.tabs.some((t) => t.id === tabId) ? node : null;
  }
  for (const child of node.children) {
    const found = findTabOwner(child, tabId);
    if (found) return found;
  }
  return null;
}

function cleanupTree(root: SplitNode): void {
  // Remove empty panels
  for (let i = root.children.length - 1; i >= 0; i--) {
    const child = root.children[i];
    if (child.type === "panel" && child.tabs.length === 0) {
      root.children.splice(i, 1);
      root.sizes.splice(i, 1);
    } else if (child.type === "split") {
      cleanupTree(child);
      if (child.children.length === 0) {
        root.children.splice(i, 1);
        root.sizes.splice(i, 1);
      } else if (child.children.length === 1) {
        root.children[i] = child.children[0];
      }
    }
  }
  // Renormalize sizes
  if (root.sizes.length > 0) {
    const total = root.sizes.reduce((a, b) => a + b, 0);
    if (total > 0) {
      root.sizes = root.sizes.map((s) => (s / total) * 100);
    }
  }
}

const STORAGE_KEY = "panel-layout-v3";

export function useLayout(testCaseCount: number) {
  const defaultLayout = createDefaultLayout(testCaseCount);

  function loadLayout(): SplitNode {
    if (typeof window === "undefined") return defaultLayout;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.type === "split") return parsed;
      }
    } catch {
      // Ignore
    }
    return defaultLayout;
  }

  const layout = ref<SplitNode>(loadLayout());

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  function persistLayout() {
    if (typeof window === "undefined") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout.value));
    }, 500);
  }

  watch(layout, persistLayout, { deep: true });

  function moveTab(
    tabId: string,
    fromPanelId: string,
    toPanelId: string,
    insertIndex?: number,
  ) {
    const root = layout.value;
    const fromPanel = findPanelById(root, fromPanelId);
    const toPanel = findPanelById(root, toPanelId);
    if (!fromPanel || !toPanel) return;

    const tabIndex = fromPanel.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    // Same panel — reorder
    if (fromPanelId === toPanelId) {
      if (insertIndex === undefined) return;
      let targetIdx = insertIndex;
      // Adjust for the removal shifting indices
      if (tabIndex < targetIdx) targetIdx--;
      if (tabIndex === targetIdx) return;
      const [tab] = fromPanel.tabs.splice(tabIndex, 1);
      fromPanel.tabs.splice(targetIdx, 0, tab);
      layout.value = { ...root };
      return;
    }

    const [tab] = fromPanel.tabs.splice(tabIndex, 1);

    if (fromPanel.activeTabId === tabId) {
      fromPanel.activeTabId = fromPanel.tabs[0]?.id ?? "";
    }

    const idx =
      insertIndex !== undefined ? insertIndex : toPanel.tabs.length;
    toPanel.tabs.splice(idx, 0, tab);
    toPanel.activeTabId = tab.id;

    cleanupTree(root);
    layout.value = { ...root };
  }

  function splitPanel(
    targetPanelId: string,
    direction: "horizontal" | "vertical",
    tabId: string,
    position: "before" | "after",
  ) {
    const root = layout.value;
    const sourcePanel = findTabOwner(root, tabId);
    if (!sourcePanel) return;

    const tabIndex = sourcePanel.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;
    const [tab] = sourcePanel.tabs.splice(tabIndex, 1);

    if (sourcePanel.activeTabId === tabId) {
      sourcePanel.activeTabId = sourcePanel.tabs[0]?.id ?? "";
    }

    const newPanel: PanelNode = {
      type: "panel",
      id: genPanelId(),
      tabs: [tab],
      activeTabId: tab.id,
    };

    // Find parent of target panel
    const parentInfo = findParent(root, targetPanelId);
    if (!parentInfo) {
      // Target is direct child or root case — shouldn't happen for well-formed trees
      return;
    }

    const { parent, index } = parentInfo;
    const targetNode = parent.children[index];

    if (parent.direction === direction) {
      // Same direction — insert adjacent
      const insertIdx = position === "before" ? index : index + 1;
      parent.children.splice(insertIdx, 0, newPanel);
      // Split the target's size in half
      const targetSize = parent.sizes[index];
      parent.sizes[index] = targetSize / 2;
      parent.sizes.splice(insertIdx, 0, targetSize / 2);
    } else {
      // Different direction — wrap target in a new split
      const newSplit: SplitNode = {
        type: "split",
        direction,
        children:
          position === "before"
            ? [newPanel, targetNode]
            : [targetNode, newPanel],
        sizes: [50, 50],
      };
      parent.children[index] = newSplit;
    }

    cleanupTree(root);
    layout.value = { ...root };
  }

  function addTab(nearTabId: string, tab: PanelTab, activate = true) {
    const root = layout.value;
    const panel = findTabOwner(root, nearTabId);
    if (!panel) return;
    // Don't add duplicates
    if (panel.tabs.some((t) => t.id === tab.id)) {
      if (activate) panel.activeTabId = tab.id;
      layout.value = { ...root };
      return;
    }
    panel.tabs.push(tab);
    if (activate) panel.activeTabId = tab.id;
    layout.value = { ...root };
  }

  function removeTab(tabId: string) {
    const root = layout.value;
    const panel = findTabOwner(root, tabId);
    if (!panel) return;
    const idx = panel.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    panel.tabs.splice(idx, 1);
    if (panel.activeTabId === tabId) {
      panel.activeTabId = panel.tabs[Math.min(idx, panel.tabs.length - 1)]?.id ?? "";
    }
    cleanupTree(root);
    layout.value = { ...root };
  }

  function updateSizesForSplit(split: SplitNode, newSizes: number[]) {
    split.sizes = newSizes;
    persistLayout();
  }

  function resetLayout() {
    layout.value = createDefaultLayout(testCaseCount);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    layout,
    moveTab,
    addTab,
    removeTab,
    splitPanel,
    updateSizesForSplit,
    resetLayout,
    findPanelById: (id: string) => findPanelById(layout.value, id),
  };
}
