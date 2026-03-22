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
    ? `<script type="module" src="/@vite/client"><\/script>
  <script>
    (function(){
      var _log=console.log,_warn=console.warn,_err=console.error;
      ['log','warn','error'].forEach(function(m){
        var orig=m==='log'?_log:m==='warn'?_warn:_err;
        console[m]=function(){
          orig.apply(console,arguments);
          try{
            var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==='string'?x:JSON.stringify(x)});
            var x=new XMLHttpRequest();x.open('POST','http://localhost:5173/__browser_log');x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({level:m,args:a}));
          }catch(e){}
        };
      });
    })();
  <\/script>`
    : "";

  const postMeta: Record<string, { title: string; description: string }> = {
    "monaco-hover-syntax-highlighting": {
      title: "Syntax-Highlighted Hover Tooltips in Monaco Editor - LearnTensors Blog",
      description: "How to add full syntax highlighting to Monaco editor hover tooltips, working around DOMPurify sanitization.",
    },
    "blog-code-block-colorization": {
      title: "Getting VS Code-Quality Syntax Highlighting in Blog Code Blocks - LearnTensors Blog",
      description: "How we built Monaco-powered syntax highlighting for static blog code blocks with function call detection, type annotations, and bracket pair colorization.",
    },
  };

  const slug = path.match(/^\/blog\/([a-z0-9-]+)\/?$/)?.[1] ?? "";
  const meta = postMeta[slug];
  const title = meta?.title ?? "Engineering Blog - LearnTensors";
  const description = meta?.description ?? "Technical deep dives from the LearnTensors team";

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
    .top-bar-center{flex:1;display:flex;justify-content:center}
    .top-bar-nav{display:flex;align-items:center;gap:16px}
    .top-bar-theme-toggle{background:none;border:none;color:#a0a0a0;cursor:pointer;padding:4px;display:flex;align-items:center}
    .top-bar-link{font-family:'Skarpa',sans-serif;color:#a0a0a0;font-size:16px;letter-spacing:1px;text-decoration:none}
    .top-bar-link:hover{color:#f5f5f5}
    .blog{background-color:#1a1a1a;min-height:calc(100vh - 50px);padding:0}
    .blog-content{width:100%;max-width:800px;margin:0 auto;padding:32px 16px;color:#d4d4d4}
    .blog-heading{color:#f5f5f5;font-size:24px;margin-bottom:24px}
    .post-item{display:flex;flex-direction:column;padding:12px 0;border-bottom:1px solid #333}
    .post-date{color:#888;font-size:13px}
    .post-title{color:#f5f5f5;text-decoration:none;font-size:16px;margin-top:2px}
    .back{margin-bottom:24px}
    .back a{color:#888;text-decoration:none;font-size:14px}
    article h1{color:#f5f5f5;font-size:28px;margin-bottom:4px}
    .meta{color:#888;font-size:14px;margin-bottom:32px}
    article h2{color:#f5f5f5;font-size:22px;margin:32px 0 12px}
    article h3{color:#f5f5f5;font-size:17px;margin:24px 0 8px}
    article p{margin-bottom:16px;line-height:1.7}
    article code{font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;background:#2d2d2d;padding:2px 6px;border-radius:4px;font-size:85%;color:#e6e6e6}
    article pre{background:#1e1e1e;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;margin-bottom:16px;line-height:1.5}
    article pre code{background:none;padding:0;font-size:14px}
    article table{width:100%;border-collapse:collapse;margin-bottom:16px}
    article th,article td{border:1px solid #333;padding:8px 12px;text-align:left;font-size:14px}
    article th{background:#2d2d2d;color:#f5f5f5}
    article ul{margin-bottom:16px;padding-left:24px}
    article li{margin-bottom:6px;line-height:1.7}
    article strong{color:#f5f5f5}
    article a{color:#58a6ff;text-decoration:none}
    article em{font-style:italic;color:#c9c9c9}
    .light-mode body,.light-mode .blog{background-color:#fff}
    .light-mode .top-bar{background-color:#f5f5f5;border-bottom:1px solid #ddd}
    .light-mode .top-bar-logo{color:#1e1e1e}
    .light-mode .top-bar-theme-toggle{color:#666}
    .light-mode .top-bar-link{color:#666}
    .light-mode .blog-content{color:#333}
    .light-mode .blog-heading{color:#1e1e1e}
    .light-mode .post-item{border-bottom-color:#ddd}
    .light-mode .post-date{color:#666}
    .light-mode .post-title{color:#1e1e1e}
    .light-mode .back a{color:#666}
    .light-mode article h1,.light-mode article h2,.light-mode article h3{color:#1e1e1e}
    .light-mode .meta{color:#666}
    .light-mode article code{background:#f0f0f0;color:#1e1e1e}
    .light-mode article pre{background:#f8f8f8;border-color:#ddd}
    .light-mode article pre code{background:none}
    .light-mode article th{background:#f0f0f0;color:#1e1e1e}
    .light-mode article th,.light-mode article td{border-color:#ddd}
    .light-mode article strong{color:#1e1e1e}
    .light-mode article a{color:#0969da}
    .light-mode article em{color:#555}
  </style>
  <script>if(localStorage.getItem('editor-theme')==='light'){document.documentElement.classList.add('light-mode')}<\/script>
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
