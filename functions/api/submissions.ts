interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const submissionId = url.searchParams.get("id");
  const problemId = url.searchParams.get("problem_id");

  // Single submission detail
  if (submissionId) {
    const row = await env.DB.prepare(
      "SELECT id, results, solution_code, created_at, submission_number, runtime_ms, peak_memory_kb FROM run_results WHERE id = ? AND user_id = 'default-user'"
    ).bind(Number(submissionId)).first<{ id: number; results: string; solution_code: string; created_at: string; submission_number: number; runtime_ms: number | null; peak_memory_kb: number | null }>();

    if (!row) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }

    const testResults = JSON.parse(row.results) as Array<{ test_id: number; passed: boolean; output: string; error: string }>;
    return Response.json({
      id: row.id,
      submission_number: row.submission_number,
      solution_code: row.solution_code,
      created_at: row.created_at,
      runtime_ms: row.runtime_ms ?? null,
      peak_memory_kb: row.peak_memory_kb ?? null,
      passed: testResults.filter((r) => r.passed).length,
      total: testResults.length,
      allPassed: testResults.every((r) => r.passed),
      test_results: testResults,
    });
  }

  if (!problemId) {
    return Response.json({ submissions: [], error: "Missing problem_id" }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    "SELECT id, results, solution_code, created_at, submission_number, runtime_ms FROM run_results WHERE user_id = 'default-user' AND problem_id = ? ORDER BY created_at DESC LIMIT 50"
  ).bind(Number(problemId)).all<{ id: number; results: string; solution_code: string; created_at: string; submission_number: number; runtime_ms: number | null }>();

  const submissions = results.map((row) => {
    const testResults = JSON.parse(row.results) as Array<{ passed: boolean }>;
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    return {
      id: row.id,
      submission_number: row.submission_number,
      passed,
      total,
      allPassed: passed === total,
      solution_code: row.solution_code,
      created_at: row.created_at,
      runtime_ms: row.runtime_ms ?? null,
    };
  });

  return Response.json({ submissions });
};
