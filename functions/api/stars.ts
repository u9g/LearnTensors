interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id") ?? "default-user";

  const { results } = await env.DB.prepare(
    "SELECT problem_id FROM stars WHERE user_id = ?"
  ).bind(userId).all();

  const starredIds = results.map((r: any) => r.problem_id);
  return Response.json(starredIds);
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const { problem_id, user_id = "default-user" } = await request.json<{
    problem_id: number;
    user_id?: string;
  }>();

  await env.DB.prepare(
    "INSERT INTO stars (user_id, problem_id) VALUES (?, ?)"
  ).bind(user_id, problem_id).run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const { problem_id, user_id = "default-user" } = await request.json<{
    problem_id: number;
    user_id?: string;
  }>();

  await env.DB.prepare(
    "DELETE FROM stars WHERE user_id = ? AND problem_id = ?"
  ).bind(user_id, problem_id).run();

  return Response.json({ ok: true });
};
