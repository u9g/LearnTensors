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
    "SELECT results, created_at FROM run_results WHERE user_id = ? AND problem_id = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(userId, Number(problemId)).first<{ results: string; created_at: string }>();

  if (!row) {
    return Response.json({ results: [], cached: false });
  }

  return Response.json({ results: JSON.parse(row.results), cached: true, created_at: row.created_at });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const { solution_code, problem_id, test_cases } =
    await request.json<RunRequest>();

  if (!solution_code || !test_cases?.length) {
    return Response.json(
      { results: [], error: "Missing solution code or test cases" },
      { status: 400 },
    );
  }

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

    // 3. Write solution file
    await writeFile(env, sandboxId, "/root/solution.py", solution_code);

    // 4. Write test files and run each
    const results: TestResult[] = [];

    for (let i = 0; i < test_cases.length; i++) {
      const tc = test_cases[i];
      const testFileName = `test_${i + 1}.py`;
      const testPath = `/root/${testFileName}`;

      await writeFile(env, sandboxId, testPath, tc.input);

      try {
        const { exitCode, result } = await executeCommand(
          env,
          sandboxId,
          `bash -c "cd /root && python ${testFileName} 2>&1"`,
          30,
        );

        results.push({
          test_id: tc.id,
          passed: exitCode === 0,
          output: result,
          error: "",
        });
      } catch (err: any) {
        results.push({
          test_id: tc.id,
          passed: false,
          output: "",
          error: err.message || "Test execution failed",
        });
      }
    }

    // 5. Cache results in DB
    if (problem_id) {
      await env.DB.prepare(
        "INSERT INTO run_results (user_id, problem_id, results) VALUES (?, ?, ?)"
      ).bind("default-user", problem_id, JSON.stringify(results)).run();
    }

    return Response.json({ results });
  } catch (err: any) {
    return Response.json(
      { results: [], error: err.message || "Execution failed" },
      { status: 500 },
    );
  } finally {
    // 6. Clean up sandbox
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
