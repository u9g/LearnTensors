interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    "SELECT id, name, slug, description, starter_code, difficulty FROM problems ORDER BY id"
  ).all();

  return Response.json(results);
};
