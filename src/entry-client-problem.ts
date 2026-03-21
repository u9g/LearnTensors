import { createApp } from "vue";
import ProblemPage from "./components/ProblemPage.vue";

declare global {
  interface Window {
    __PROBLEM__: any;
  }
}

createApp(ProblemPage, { problem: window.__PROBLEM__ }).mount("#app");
