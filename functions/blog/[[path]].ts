import { renderBlogPage } from "../../dist/server/entry-server.js";

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const path = url.pathname;

  const appHtml = await renderBlogPage(path);

  const isDev = url.hostname === "localhost";
  const jsPath = isDev ? "/src/entry-blog.ts" : "/assets/blog.js";
  const cssLink = isDev
    ? ""
    : '<link rel="stylesheet" href="/assets/blog.css" />';
  const viteClient = isDev
    ? `<script type="module" src="/@vite/client"><\/script>`
    : "";

  const title =
    path === "/blog/" || path === "/blog"
      ? "Engineering Blog - LearnTensors"
      : "Syntax-Highlighted Hover Tooltips in Monaco Editor - LearnTensors Blog";

  const description =
    path === "/blog/" || path === "/blog"
      ? "Technical deep dives from the LearnTensors team"
      : "How to add full syntax highlighting to Monaco editor hover tooltips, working around DOMPurify sanitization.";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  ${cssLink}
  <link rel="preload" href="/fonts/Skarpa-Regular.ttf" as="font" type="font/ttf" crossorigin />
  <style>
    @font-face{font-family:'Skarpa';src:url('/fonts/Skarpa-Regular.ttf') format('truetype');font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#1a1a1a;color:#d4d4d4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
    a{color:inherit;text-decoration:none}
    .top-bar{background-color:#262626;height:50px;padding:0 20px;width:100%;display:flex;align-items:center;flex-shrink:0}
    .top-bar-logo{font-family:'Skarpa',sans-serif;font-size:24px;color:#f5f5f5;letter-spacing:2px;text-decoration:none}
    .top-bar-nav{margin-left:auto}
    .top-bar-link{font-family:'Skarpa',sans-serif;color:#a0a0a0;font-size:16px;letter-spacing:1px;text-decoration:none}
    .top-bar-link:hover{color:#f5f5f5}
  </style>
</head>
<body>
  <div id="app">${appHtml}</div>
  ${viteClient}
  <script type="module" src="${jsPath}"><\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
