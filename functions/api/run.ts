interface Env {
  DB: D1Database;
  DAYTONA_API_KEY: string;
  DAYTONA_API_URL: string;
  DAYTONA_SNAPSHOT: string;
}

interface TestCase {
  id: number;
  input: string;
  expected_output: string;
}

interface RunRequest {
  solution_code: string;
  problem_id: number;
  test_harness: string;
  test_cases: TestCase[];
}

interface TestResult {
  test_id: number;
  passed: boolean;
  output: string;
  error: string;
}

interface SandboxResponse {
  id: string;
  state: string;
  toolboxProxyUrl: string;
}

const TOOLBOX_URL = "https://proxy.app.daytona.io/toolbox";

async function daytonaFetch(
  env: Env,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.DAYTONA_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function waitForSandbox(
  env: Env,
  sandboxId: string,
  maxWaitMs = 30000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await daytonaFetch(
      env,
      `${env.DAYTONA_API_URL}/sandbox/${sandboxId}`,
    );
    if (!res.ok) throw new Error(`Failed to check sandbox state (${res.status})`);
    const data = await res.json<SandboxResponse>();
    if (data.state === "started") return;
    if (data.state === "error") throw new Error("Sandbox entered error state");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Sandbox did not start in time");
}

async function executeCommand(
  env: Env,
  sandboxId: string,
  command: string,
  timeout = 30,
): Promise<{ exitCode: number; result: string }> {
  const res = await daytonaFetch(
    env,
    `${TOOLBOX_URL}/${sandboxId}/process/execute`,
    {
      method: "POST",
      body: JSON.stringify({ command, timeout }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Execute command failed (${res.status}): ${text}`);
  }
  return res.json();
}

function toBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function writeFile(
  env: Env,
  sandboxId: string,
  path: string,
  content: string,
): Promise<void> {
  const b64 = toBase64(content);
  await executeCommand(
    env,
    sandboxId,
    `bash -c "printf '%s' '${b64}' | base64 -d > ${path}"`,
  );
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const problemId = url.searchParams.get("problem_id");
  const userId = url.searchParams.get("user_id") ?? "default-user";

  if (!problemId) {
    return Response.json({ results: [], error: "Missing problem_id" }, { status: 400 });
  }

  const row = await env.DB.prepare(
    "SELECT results, created_at, submission_number, runtime_ms, peak_memory_kb FROM run_results WHERE user_id = ? AND problem_id = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(userId, Number(problemId)).first<{ results: string; created_at: string; submission_number: number; runtime_ms: number; peak_memory_kb: number | null }>();

  if (!row) {
    return Response.json({ results: [], cached: false });
  }

  return Response.json({ results: JSON.parse(row.results), cached: true, created_at: row.created_at, submission_number: row.submission_number, runtime_ms: row.runtime_ms, peak_memory_kb: row.peak_memory_kb });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const { solution_code, problem_id, test_harness, test_cases } =
    await request.json<RunRequest>();

  if (!solution_code || !test_cases?.length || !test_harness) {
    return Response.json(
      { results: [], error: "Missing solution code, test harness, or test cases" },
      { status: 400 },
    );
  }

  if (solution_code.length > 1_000_000) {
    return Response.json(
      { results: [], error: "Solution code exceeds 1MB limit" },
      { status: 413 },
    );
  }

  // Fetch correct code server-side so it's never exposed to the client
  const problemRow = await env.DB.prepare(
    "SELECT correct_code FROM problems WHERE id = ?"
  ).bind(problem_id).first<{ correct_code: string }>();
  const correct_code = problemRow?.correct_code ?? "";

  // Build test case data as JSON array of arrays
  const casesJson = JSON.stringify(
    test_cases.map((tc) => JSON.parse(`[${tc.input}]`)),
  );

  // Runner reads test cases from stdin
  const runner = `import json, sys, traceback, resource

exec(open('test_harness.py').read())

cases = json.loads(sys.stdin.read())
results = []
for i, args in enumerate(cases):
    try:
        test(*args)
        results.append({"test_id": i + 1, "passed": True, "output": f"Test {i + 1} passed!", "error": ""})
    except AssertionError as e:
        results.append({"test_id": i + 1, "passed": False, "output": "", "error": str(e)})
    except Exception:
        results.append({"test_id": i + 1, "passed": False, "output": "", "error": traceback.format_exc()})

print("__TEST_RESULTS__:" + json.dumps(results))
print("__MAXRSS:" + str(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss))
`;

  let sandboxId: string | null = null;

  try {
    // 1. Create sandbox from snapshot
    const createRes = await daytonaFetch(env, `${env.DAYTONA_API_URL}/sandbox`, {
      method: "POST",
      body: JSON.stringify({
        language: "python",
        snapshot: env.DAYTONA_SNAPSHOT,
      }),
    });
    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`Sandbox creation failed (${createRes.status}): ${text}`);
    }
    const sandbox = await createRes.json<SandboxResponse>();
    sandboxId = sandbox.id;

    // 2. Wait for sandbox to be ready
    await waitForSandbox(env, sandboxId);

    // 3. Write files
    await writeFile(env, sandboxId, "/root/solution.py", solution_code);
    if (correct_code) {
      await writeFile(env, sandboxId, "/root/correct_solution.py", correct_code);
    }
    await writeFile(env, sandboxId, "/root/test_harness.py", test_harness);
    await writeFile(env, sandboxId, "/root/runner.py", runner);
    await writeFile(env, sandboxId, "/root/cases.json", casesJson);

    // 4. Run all tests in a single process
    const runStartTime = Date.now();
    const { result: rawOutput } = await executeCommand(
      env,
      sandboxId,
      `bash -c "cd /root && python runner.py < cases.json 2>&1"`,
      60,
    );
    const runtimeMs = Date.now() - runStartTime;

    // Parse results
    let results: TestResult[] = [];
    const resultsMatch = rawOutput.match(/__TEST_RESULTS__:(.+)/);
    if (resultsMatch) {
      results = JSON.parse(resultsMatch[1]);
    } else {
      // Runner itself crashed — report as a single error
      results = test_cases.map((tc, i) => ({
        test_id: i + 1,
        passed: false,
        output: "",
        error: rawOutput || "Test runner failed",
      }));
    }

    let peakMemoryKb = 0;
    const memMatch = rawOutput.match(/__MAXRSS:(\d+)/);
    if (memMatch) {
      peakMemoryKb = parseInt(memMatch[1]);
    }

    // 5. Cache results in DB
    let submissionNumber = 0;
    if (problem_id) {
      const prev = await env.DB.prepare(
        "SELECT MAX(submission_number) as max_num FROM run_results WHERE user_id = ? AND problem_id = ?"
      ).bind("default-user", problem_id).first<{ max_num: number | null }>();
      submissionNumber = (prev?.max_num ?? 0) + 1;

      await env.DB.prepare(
        "INSERT INTO run_results (user_id, problem_id, results, solution_code, submission_number, runtime_ms, peak_memory_kb) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind("default-user", problem_id, JSON.stringify(results), solution_code, submissionNumber, runtimeMs, peakMemoryKb || null).run();
    }

    return Response.json({ results, submission_number: submissionNumber, runtime_ms: runtimeMs, peak_memory_kb: peakMemoryKb || null });
  } catch (err: any) {
    return Response.json(
      { results: [], error: err.message || "Execution failed" },
      { status: 500 },
    );
  } finally {
    if (sandboxId) {
      try {
        await daytonaFetch(
          env,
          `${env.DAYTONA_API_URL}/sandbox/${sandboxId}`,
          { method: "DELETE" },
        );
      } catch {
        // Best-effort cleanup
      }
    }
  }
};
