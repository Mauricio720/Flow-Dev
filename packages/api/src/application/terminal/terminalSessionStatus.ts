export const TERMINAL_SESSION_STATUSES = ["opening", "running", "waiting", "unconfirmed", "ended", "launch_failed", "asking", "interrupted"] as const;

export type TerminalSessionStatus = (typeof TERMINAL_SESSION_STATUSES)[number];

export const FINAL_SESSION_STATUSES: ReadonlySet<TerminalSessionStatus> = new Set(["ended", "launch_failed"]);

export function isActiveSession(status: TerminalSessionStatus): boolean {
  return !FINAL_SESSION_STATUSES.has(status);
}
