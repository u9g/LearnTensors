import { parseCookies, serializeCookie } from "../../lib/cookies";
import { sanitizeRedirect } from "../../lib/redirects";

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  const cookies = parseCookies(request.headers.get("Cookie"));
  const oauthState = cookies["__oauth_state"];
  if (!oauthState) {
    return new Response("Missing OAuth state cookie", { status: 400 });
  }

  const colonIdx = oauthState.indexOf(":");
  const savedState = colonIdx === -1 ? oauthState : oauthState.slice(0, colonIdx);
  const redirect = sanitizeRedirect(colonIdx === -1 ? "/" : oauthState.slice(colonIdx + 1));

  if (state !== savedState) {
    return new Response("State mismatch", { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json<{ access_token?: string; error?: string }>();
  if (!tokenData.access_token) {
    return new Response(`GitHub token error: ${tokenData.error || "unknown"}`, { status: 400 });
  }

  // Fetch GitHub user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "LearnTensors",
    },
  });

  if (!userRes.ok) {
    return new Response("Failed to fetch GitHub user", { status: 500 });
  }

  const ghUser = await userRes.json<{ id: number; login: string; avatar_url: string }>();
  const userId = `github:${ghUser.id}`;
  const sessionId = crypto.randomUUID();

  // 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, github_login, github_avatar_url, expires_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(sessionId, userId, ghUser.login, ghUser.avatar_url, expiresAt)
    .run();

  const isSecure = url.protocol === "https:";
  const sessionCookie = serializeCookie("__session", sessionId, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  const clearOauthState = serializeCookie("__oauth_state", "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });

  return new Response(null, {
    status: 302,
    headers: [
      ["Location", redirect || "/"],
      ["Set-Cookie", sessionCookie],
      ["Set-Cookie", clearOauthState],
    ],
  });
};
