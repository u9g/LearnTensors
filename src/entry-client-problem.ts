import { createSSRApp } from "vue";
import ProblemPage from "./components/ProblemPage.vue";

declare global {
  interface Window {
    __PROBLEM__: any;
  }
}

createSSRApp(ProblemPage, { problem: window.__PROBLEM__ }).mount("#app");
