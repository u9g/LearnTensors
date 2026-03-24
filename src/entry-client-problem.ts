import { createSSRApp } from "vue";
import ProblemPage from "./components/ProblemPage.vue";
import "./style.css";

declare global {
  interface Window {
    __PROBLEM__: any;
    __USER__: { userId: string; login: string; avatarUrl: string } | null;
  }
}

createSSRApp(ProblemPage, { problem: window.__PROBLEM__, user: window.__USER__ }).mount("#app");
document.getElementById("app")!.style.visibility = "visible";
