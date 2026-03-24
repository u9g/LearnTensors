import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import ProblemPage from "./components/ProblemPage.vue";

export async function renderProblemPage(problem: any, user?: any): Promise<string> {
  const app = createSSRApp(ProblemPage, { problem, user: user ?? null });
  return await renderToString(app);
}
