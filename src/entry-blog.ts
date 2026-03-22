import { createApp } from "vue";
import "./style.css";
import BlogApp from "./BlogApp.vue";

createApp(BlogApp).mount("#app");
document.getElementById("app")!.style.visibility = "visible";
