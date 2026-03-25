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
    @font-face{font-family:'Skarpa';src:url('/fonts/Skarpa-Regular.ttf') format('truetype');font-display:block}
    :root{--bg:#1e1e1e;--bg2:#1a1a1a;--bg3:#252526;--fg:#f5f5f5;--fg2:#ccc;--border:#333;--code-bg:#262626}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;overflow:hidden;height:100vh}
    a{color:inherit;text-decoration:none}
    .top-bar{background-color:var(--bg3);height:50px;padding:0 20px;width:100%;display:flex;align-items:center;flex-shrink:0}
    .top-bar-logo{font-family:'Skarpa',sans-serif;font-size:24px;color:var(--fg);letter-spacing:2px;text-decoration:none}
    .top-bar-center{flex:1;display:flex;justify-content:center}
    .top-bar-nav{display:flex;align-items:center;gap:16px}
    .top-bar-link{font-family:'Skarpa',sans-serif;color:#a0a0a0;font-size:16px;letter-spacing:1px;text-decoration:none}
    .top-bar-link:hover{color:var(--fg)}
    .layout{display:flex;height:calc(100vh - 50px)}
    .left-panel{width:40%;min-width:0;overflow-y:auto;padding:24px;border-right:1px solid var(--border);background:var(--bg2)}
    .right-panel{flex:1;display:flex;flex-direction:column;background:var(--bg);min-width:0}
    .editor-tabs{display:flex;align-items:center;height:36px;background:var(--bg3);border-bottom:1px solid var(--border);padding:0 8px;flex-shrink:0}
    .editor-tab{font-size:13px;color:#888;padding:6px 12px;background:var(--bg3);border-top:1px solid transparent;cursor:pointer}
    .editor-tab.active{color:var(--fg2);background:var(--bg);border-top:1px solid #007acc}
    .editor-container{flex:1;min-height:0;position:relative}
    .editor-placeholder{margin:0;padding:12px 0 0 64px;font-family:'SF Mono','Fira Code',Menlo,Consolas,monospace;font-size:14px;color:var(--fg2);background:var(--bg);height:100%;overflow:hidden;white-space:pre}
    .editor-placeholder code{font:inherit;color:inherit}
    .problem-header{display:flex;align-items:baseline;gap:12px;margin-bottom:20px;flex-wrap:wrap}
    .problem-title{font-size:20px;font-weight:600}
    .difficulty-easy{color:#00b8a3}.difficulty-medium{color:#ffc01e}.difficulty-hard{color:#ff375f}
    .problem-difficulty{font-size:14px}
    .problem-description{font-size:14px;line-height:1.7;color:var(--fg2);word-break:break-word}
    .problem-description h2{font-size:16px;font-weight:600;color:var(--fg);margin:20px 0 8px}
    .problem-description p{margin:8px 0}
    .problem-description code{font-family:'SF Mono','Fira Code',Menlo,Consolas,monospace;font-size:13px;background:var(--code-bg);padding:2px 5px;border-radius:3px;color:var(--fg2)}
    .problem-description pre{background:var(--code-bg);border-radius:6px;padding:12px 14px;overflow-x:auto;margin:8px 0}
    .problem-description pre code{background:none;padding:0}
    .problem-description ul,.problem-description ol{padding-left:20px;margin:8px 0}
    .problem-description li{margin:4px 0}
    .problem-description strong{color:var(--fg)}
    .test-cases{margin-top:24px;display:flex;flex-direction:column;gap:12px}
    .section-label{font-size:14px;font-weight:600;margin-bottom:8px;color:var(--fg)}
    .test-case{background:var(--code-bg);border-radius:6px;padding:12px 14px;overflow-x:auto}
    .test-case-label{color:#888;margin-bottom:4px;font-size:12px}
    .test-case pre{background:none;margin:4px 0;padding:0;border-radius:0}
    .test-case code{font-family:'SF Mono','Fira Code',Menlo,Consolas,monospace;font-size:13px;color:var(--fg2);white-space:pre-wrap;word-break:break-word}
    @media(max-width:768px){body{overflow:auto;height:auto}.layout{flex-direction:column;height:auto}.left-panel{width:100%;border-right:none;border-bottom:1px solid var(--border);padding:16px}.right-panel{height:60vh;min-height:300px}.problem-title{font-size:18px}}
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
