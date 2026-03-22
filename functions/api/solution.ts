interface Env {
  DB: D1Database;
}

const MAX_CODE_LENGTH = 1_000_000; // 1MB

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const problemId = url.searchParams.get("problem_id");
  const userId = url.searchParams.get("user_id") ?? "default-user";

  if (!problemId) {
    return Response.json({ error: "Missing problem_id" }, { status: 400 });
  }

  const row = await env.DB.prepare(
    "SELECT code, updated_at FROM user_solutions WHERE user_id = ? AND problem_id = ?"
  ).bind(userId, Number(problemId)).first<{ code: string; updated_at: string }>();

  if (!row) {
    return Response.json({ code: null });
  }

  return Response.json({ code: row.code, updated_at: row.updated_at });
};

export const onRequestPut: PagesFunction<Env> = async ({ env, request }) => {
  const { problem_id, code, user_id } = await request.json<{
    problem_id: number;
    code: string;
    user_id?: string;
  }>();

  const userId = user_id ?? "default-user";

  if (!problem_id || typeof code !== "string") {
    return Response.json({ error: "Missing problem_id or code" }, { status: 400 });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return Response.json({ error: "Code exceeds 1MB limit" }, { status: 413 });
  }

  await env.DB.prepare(
    "INSERT INTO user_solutions (user_id, problem_id, code, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, problem_id) DO UPDATE SET code = excluded.code, updated_at = excluded.updated_at"
  ).bind(userId, problem_id, code).run();

  return Response.json({ ok: true });
};
