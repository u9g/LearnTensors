import { renderProblemPage } from "../../dist/server/entry-server.js";

interface Env {
  DB: D1Database;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const slug = params.slug as string;

  const problem = await env.DB.prepare(
    "SELECT id, name, slug, description, starter_code, difficulty, test_harness FROM problems WHERE slug = ?"
  )
    .bind(slug)
    .first();

  if (!problem) {
    return new Response("Not found", { status: 404 });
  }

  const { results: testCases } = await env.DB.prepare(
    "SELECT id, input, expected_output FROM test_cases WHERE problem_id = ? ORDER BY id"
  )
    .bind(problem.id)
    .all();

  const problemObj = { ...problem, test_cases: testCases } as any;
  const safeJson = (obj: unknown) =>
    JSON.stringify(obj).replace(/</g, "\\u003c");
  const problemData = safeJson(problemObj);

  // Server-render the Vue component
  const user = (context.data as any).user ?? null;
  const appHtml = await renderProblemPage(problemObj, user);

  // In dev, Vite serves source directly; in prod, use the built assets
  const reqHostname = new URL(request.url).hostname;
  const isDev = reqHostname === "localhost" || reqHostname === "127.0.0.1";
  const jsPath = isDev ? "/src/entry-client-problem.ts" : "/assets/problem-page.js";
  const cssLink = isDev ? "" : '<link rel="stylesheet" href="/assets/problem-page.css" />';
  const viteClient = isDev ? `<script type="module" src="/@vite/client"><\/script>
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
  <\/script>` : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>${esc(problem.name as string)} - LearnTensors</title>
  <meta name="description" content="${esc((problem.description as string).slice(0, 160))}" />
  ${cssLink}
  ${isDev ? '<link rel="modulepreload" href="/node_modules/monaco-editor/esm/vs/editor/edcore.main.js" />' : '<link rel="modulepreload" href="/assets/problem-page.js" />'}
  <link rel="preload" href="/fonts/Skarpa-Regular.ttf" as="font" type="font/ttf" crossorigin />
  <style>
    :root{--bg:#1e1e1e;--bg2:#1a1a1a;--bg3:#252526;--fg:#f5f5f5;--fg2:#ccc;--border:#333;--code-bg:#262626}
    body{background:var(--bg);margin:0}
  </style>
  <script>
    if(localStorage.getItem('editor-theme')==='light'){document.documentElement.classList.add('light-mode');var s=document.documentElement.style;s.setProperty('--bg','#fff');s.setProperty('--bg2','#f5f5f5');s.setProperty('--bg3','#e8e8e8');s.setProperty('--fg','#1e1e1e');s.setProperty('--fg2','#333');s.setProperty('--border','#ccc');s.setProperty('--code-bg','#f0f0f0')}
  <\/script>
</head>
<body>
  <div id="app">${appHtml}</div>
  <script>window.__PROBLEM__ = ${problemData};window.__USER__ = ${safeJson((context.data as any).user)};<\/script>
  ${viteClient}
  <script type="module" src="${jsPath}"><\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
