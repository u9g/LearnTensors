import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import ProblemPage from "./components/ProblemPage.vue";

export async function renderProblemPage(problem: any): Promise<string> {
  const app = createSSRApp(ProblemPage, { problem });
  return await renderToString(app);
}
