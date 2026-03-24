import { useLayout as useLayoutBase } from "reactive-layout";
import type { PanelTab, SplitNode } from "reactive-layout";

export type PanelType = "description" | "submissions" | "submission-detail" | "test-cases" | "editor" | "output";

export type { PanelTab, PanelNode, SplitNode, LayoutNode } from "reactive-layout";

function createDefaultLayout(): SplitNode {
  const editorTabs: PanelTab[] = [
    { id: "solution", panelType: "editor", label: "solution.py" },
    { id: "test-harness", panelType: "editor", label: "test_harness.py" },
  ];

  return {
    type: "split",
    direction: "horizontal",
    children: [
      {
        type: "panel",
        id: "left",
        tabs: [
          { id: "desc", panelType: "description", label: "Description" },
          { id: "test-cases", panelType: "test-cases", label: "Test Cases" },
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

export function useLayout() {
  return useLayoutBase({
    defaultLayout: createDefaultLayout(),
    storageKey: "panel-layout-v4",
  });
}
