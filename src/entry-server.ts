import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import ProblemPage from "./components/ProblemPage.vue";
import BlogApp from "./BlogApp.vue";

export async function renderProblemPage(problem: any): Promise<string> {
  const app = createSSRApp(ProblemPage, { problem });
  return await renderToString(app);
}

export async function renderBlogPage(path: string): Promise<string> {
  const app = createSSRApp(BlogApp, { path });
  return await renderToString(app);
}
