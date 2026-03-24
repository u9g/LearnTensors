import { parseCookies } from "./lib/cookies";

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export interface AuthUser {
  userId: string;
  login: string;
  avatarUrl: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const cookies = parseCookies(context.request.headers.get("Cookie"));
  const sessionId = cookies["__session"];

  let user: AuthUser | null = null;

  if (sessionId) {
    const row = await context.env.DB.prepare(
      "SELECT user_id, github_login, github_avatar_url FROM sessions WHERE id = ? AND datetime(expires_at) > datetime('now')"
    )
      .bind(sessionId)
      .first<{ user_id: string; github_login: string; github_avatar_url: string }>();

    if (row) {
      user = {
        userId: row.user_id,
        login: row.github_login,
        avatarUrl: row.github_avatar_url,
      };
    }
  }

  context.data.user = user;
  return context.next();
};
