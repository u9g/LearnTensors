export function sanitizeRedirect(redirect: string | null | undefined): string {
  const value = redirect?.trim();
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  if (/[\u0000-\u001F\u007F]/.test(value)) return "/";
  return value;
}
