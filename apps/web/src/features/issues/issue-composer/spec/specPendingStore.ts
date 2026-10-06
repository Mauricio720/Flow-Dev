import type { PendingSpecCommand } from "./specCommandState";

const KEY_PREFIX = "flow-dev:spec-pending:";
export type PendingScope = { viewerId: string; projectId: string; taskId: string };

const keyOf = (scope: PendingScope) => `${KEY_PREFIX}${scope.viewerId}:${scope.projectId}:${scope.taskId}`;

function storage() {
  try { return window.sessionStorage; } catch { return null; }
}

export function saveSpecPending(scope: PendingScope, command: PendingSpecCommand) {
  try { storage()?.setItem(keyOf(scope), JSON.stringify(command)); } catch { return; }
}

export function clearSpecPending(scope: PendingScope) {
  try { storage()?.removeItem(keyOf(scope)); } catch { return; }
}

export function loadSpecPending(scope: PendingScope): PendingSpecCommand | null {
  try {
    const raw = storage()?.getItem(keyOf(scope));
    const value = raw ? JSON.parse(raw) as Partial<PendingSpecCommand> : null;
    const valid = value && typeof value.requestKey === "string" && typeof value.expectedSpecVersion === "number" && value.request && typeof value.request.action === "string";
    return valid ? value as PendingSpecCommand : null;
  } catch { return null; }
}

export function clearAllSpecPending() {
  try {
    const store = storage();
    if (!store) return;
    for (const key of Object.keys(store).filter((name) => name.startsWith(KEY_PREFIX))) store.removeItem(key);
  } catch { return; }
}
