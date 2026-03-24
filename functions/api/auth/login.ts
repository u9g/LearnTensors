import { serializeCookie } from "../../lib/cookies";

interface Env {
  GITHUB_CLIENT_ID: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);

  // GitHub requires 127.0.0.1 for loopback redirects. If the user is on
  // localhost, redirect them to 127.0.0.1 first so the state cookie domain
  // matches where GitHub will send the callback.
  if (url.hostname === "localhost") {
    const loopbackUrl = new URL(request.url);
    loopbackUrl.hostname = "127.0.0.1";
    return new Response(null, {
      status: 302,
      headers: { Location: loopbackUrl.toString() },
    });
  }

  const redirect = url.searchParams.get("redirect") || "/";
  const state = crypto.randomUUID();

  const stateCookie = serializeCookie("__oauth_state", `${state}:${redirect}`, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/callback`,
    state,
    scope: "read:user",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie": stateCookie,
    },
  });
};
