interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;

  if (user) {
    return Response.json({
      authenticated: true,
      userId: user.userId,
      login: user.login,
      avatarUrl: user.avatarUrl,
    });
  }

  return Response.json({ authenticated: false });
};
