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

  const problemData = JSON.stringify({ ...problem, test_cases: testCases });

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
</head>
<body>
  <div id="app"></div>
  <script>window.__PROBLEM__ = ${problemData};<\/script>
  <script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"><\/script>
  ${viteClient}
  <script type="module" src="${jsPath}"><\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
