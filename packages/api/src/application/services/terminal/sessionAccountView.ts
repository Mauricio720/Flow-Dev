import type { ExecutionSessionRow } from "../../database/dao/terminalExecutionDao";

export function sessionAccountView(session: Pick<ExecutionSessionRow, "accountId" | "accountLabel" | "accountOwnerUserId" | "accountRemovedAt">, viewerUserId: string) {
  if (session.accountId === null) return { kind: "default" as const, label: null, removed: false };
  const own = session.accountOwnerUserId === viewerUserId;
  return { kind: own ? "own" as const : "other" as const, label: own ? session.accountLabel : null, removed: session.accountRemovedAt !== null };
}
