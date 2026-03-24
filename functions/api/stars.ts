interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json([]);

  const { results } = await context.env.DB.prepare(
    "SELECT problem_id FROM stars WHERE user_id = ?"
  ).bind(user.userId).all();

  const starredIds = results.map((r: any) => r.problem_id);
  return Response.json(starredIds);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { problem_id } = await context.request.json<{ problem_id: number }>();

  await context.env.DB.prepare(
    "INSERT INTO stars (user_id, problem_id) VALUES (?, ?)"
  ).bind(user.userId, problem_id).run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { problem_id } = await context.request.json<{ problem_id: number }>();

  await context.env.DB.prepare(
    "DELETE FROM stars WHERE user_id = ? AND problem_id = ?"
  ).bind(user.userId, problem_id).run();

  return Response.json({ ok: true });
};
