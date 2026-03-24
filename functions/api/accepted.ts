interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json([]);

  const { results } = await context.env.DB.prepare(
    "SELECT problem_id, results FROM run_results WHERE user_id = ?"
  ).bind(user.userId).all<{ problem_id: number; results: string }>();

  const accepted = new Set<number>();
  for (const row of results) {
    if (accepted.has(row.problem_id)) continue;
    const tests = JSON.parse(row.results) as Array<{ passed: boolean }>;
    if (tests.length > 0 && tests.every((t) => t.passed)) {
      accepted.add(row.problem_id);
    }
  }

  return Response.json([...accepted]);
};
