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

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const slug = params.slug as string;

  const problem = await env.DB.prepare(
    "SELECT id, name, slug, description, starter_code, difficulty FROM problems WHERE slug = ?"
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
  const problemData = JSON.stringify(problemObj);

  // Server-render the Vue component
  const appHtml = await renderProblemPage(problemObj);

  // In dev, Vite serves source directly; in prod, use the built assets
  const isDev = new URL(request.url).hostname === "localhost";
  const jsPath = isDev ? "/src/entry-client-problem.ts" : "/assets/problem-page.js";
  const cssLink = isDev ? "" : '<link rel="stylesheet" href="/assets/problem-page.css" />';
  const viteClient = isDev ? '<script type="module" src="/@vite/client"><\/script>' : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(problem.name as string)} - LearnTensors</title>
  <meta name="description" content="${esc((problem.description as string).slice(0, 160))}" />
  ${cssLink}
  <link rel="preload" href="/fonts/Skarpa-Regular.ttf" as="font" type="font/ttf" crossorigin />
  <style>
    @font-face{font-family:'Skarpa';src:url('/fonts/Skarpa-Regular.ttf') format('truetype');font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#1e1e1e;color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;overflow:hidden;height:100vh}
    a{color:inherit;text-decoration:none}
    .top-bar{background-color:#262626;height:50px;padding:0 20px;width:100%;display:flex;align-items:center;flex-shrink:0}
    .top-bar-logo{font-family:'Skarpa',sans-serif;font-size:24px;color:#F5F5F5;letter-spacing:2px;text-decoration:none}
    .layout{display:flex;height:calc(100vh - 50px)}
    .left-panel{width:40%;min-width:0;overflow-y:auto;padding:24px;border-right:1px solid #333;background:#1a1a1a}
    .right-panel{flex:1;display:flex;flex-direction:column;background:#1e1e1e;min-width:0}
    .editor-tabs{display:flex;align-items:center;height:36px;background:#252526;border-bottom:1px solid #333;padding:0 8px;flex-shrink:0}
    .editor-tab{font-size:13px;color:#ccc;padding:6px 12px;background:#1e1e1e;border-top:1px solid #007acc}
    .editor-container{flex:1;min-height:0;position:relative}
    .editor-placeholder{margin:0;padding:12px 0 0 64px;font-family:'SF Mono','Fira Code',Menlo,Consolas,monospace;font-size:14px;color:#d4d4d4;background:#1e1e1e;height:100%;overflow:hidden;white-space:pre}
    .editor-placeholder code{font:inherit;color:inherit}
    .problem-header{display:flex;align-items:baseline;gap:12px;margin-bottom:20px;flex-wrap:wrap}
    .problem-title{font-size:20px;font-weight:600}
    .difficulty-easy{color:#00b8a3}.difficulty-medium{color:#ffc01e}.difficulty-hard{color:#ff375f}
    .problem-difficulty{font-size:14px}
    .problem-description{font-size:14px;line-height:1.7;color:#ccc;word-break:break-word}
    .problem-description h2{font-size:16px;font-weight:600;color:#f5f5f5;margin:20px 0 8px}
    .problem-description p{margin:8px 0}
    .problem-description code{font-family:'SF Mono','Fira Code',Menlo,Consolas,monospace;font-size:13px;background:#2a2a2a;padding:2px 5px;border-radius:3px;color:#e0e0e0}
    .problem-description pre{background:#262626;border-radius:6px;padding:12px 14px;overflow-x:auto;margin:8px 0}
    .problem-description pre code{background:none;padding:0}
    .problem-description ul,.problem-description ol{padding-left:20px;margin:8px 0}
    .problem-description li{margin:4px 0}
    .problem-description strong{color:#f5f5f5}
    .test-cases{margin-top:24px;display:flex;flex-direction:column;gap:12px}
    .section-label{font-size:14px;font-weight:600;margin-bottom:8px;color:#f5f5f5}
    .test-case{background:#262626;border-radius:6px;padding:12px 14px;overflow-x:auto}
    .test-case-label{color:#888;margin-bottom:4px;font-size:12px}
    .test-case pre{background:none;margin:4px 0;padding:0;border-radius:0}
    .test-case code{font-family:'SF Mono','Fira Code',Menlo,Consolas,monospace;font-size:13px;color:#e0e0e0;white-space:pre-wrap;word-break:break-word}
    @media(max-width:768px){body{overflow:auto;height:auto}.layout{flex-direction:column;height:auto}.left-panel{width:100%;border-right:none;border-bottom:1px solid #333;padding:16px}.right-panel{height:60vh;min-height:300px}.problem-title{font-size:18px}}
  </style>
</head>
<body>
  <div id="app">${appHtml}</div>
  <script>window.__PROBLEM__ = ${problemData};<\/script>
  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"><\/script>
  ${viteClient}
  <script type="module" src="${jsPath}"><\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
