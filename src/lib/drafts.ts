function draftKey(slug: string): string {
  return `code:${slug}`;
}

function pendingAuthDraftKey(slug: string): string {
  return `pending-auth-code:${slug}`;
}

export function readSavedDraft(slug: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(draftKey(slug));
}

export function writeSavedDraft(slug: string, code: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(draftKey(slug), code);
}

export function readPendingAuthDraft(slug: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(pendingAuthDraftKey(slug));
}

export function clearPendingAuthDraft(slug: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(pendingAuthDraftKey(slug));
}

export function stashPendingAuthDraft(slug: string, code: string): void {
  if (typeof localStorage === "undefined") return;
  writeSavedDraft(slug, code);
  localStorage.setItem(pendingAuthDraftKey(slug), code);
}
