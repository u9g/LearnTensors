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

const PENDING_STAR_KEY = "pending-star";

export function setPendingStar(problemId: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PENDING_STAR_KEY, String(problemId));
}

export function consumePendingStar(): number | null {
  if (typeof localStorage === "undefined") return null;
  const val = localStorage.getItem(PENDING_STAR_KEY);
  if (val) {
    localStorage.removeItem(PENDING_STAR_KEY);
    return Number(val);
  }
  return null;
}

const PENDING_RUN_KEY = "pending-run";

export function setPendingRun(slug: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PENDING_RUN_KEY, slug);
}

export function consumePendingRun(slug: string): boolean {
  if (typeof localStorage === "undefined") return false;
  if (localStorage.getItem(PENDING_RUN_KEY) === slug) {
    localStorage.removeItem(PENDING_RUN_KEY);
    return true;
  }
  return false;
}
