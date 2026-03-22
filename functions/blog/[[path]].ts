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
