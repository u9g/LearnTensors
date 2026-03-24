import { parseCookies, serializeCookie } from "../../lib/cookies";

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = cookies["__session"];

  if (sessionId) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }

  const url = new URL(request.url);
  const clearCookie = serializeCookie("__session", "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookie,
    },
  });
};
