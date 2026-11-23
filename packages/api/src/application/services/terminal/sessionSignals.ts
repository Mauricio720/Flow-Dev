import { isActiveSession, type TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export const SESSION_SIGNALS = ["request_opened", "requests_settled", "turn_ended", "interrupted", "orphaned", "ended", "work"] as const;

export type SessionSignal = (typeof SESSION_SIGNALS)[number];

type Transitions = Partial<Record<TerminalSessionStatus, TerminalSessionStatus>>;

const ACTIVE_STATUSES: TerminalSessionStatus[] = ["opening", "unconfirmed", "running", "asking", "waiting", "interrupted"];
const toEveryActive = (target: TerminalSessionStatus): Transitions => Object.fromEntries(ACTIVE_STATUSES.map((status) => [status, target]));

const SIGNAL_TRANSITIONS: Record<SessionSignal, Transitions> = {
  work: { opening: "running", unconfirmed: "running", waiting: "running", interrupted: "running" },
  request_opened: { running: "asking" },
  requests_settled: { asking: "running" },
  turn_ended: { running: "waiting", asking: "waiting" },
  interrupted: { running: "waiting", asking: "waiting" },
  orphaned: toEveryActive("interrupted"),
  ended: toEveryActive("ended"),
};

export function applySessionSignal(status: TerminalSessionStatus, signal: SessionSignal): TerminalSessionStatus | null {
  if (!isActiveSession(status)) return null;
  return SIGNAL_TRANSITIONS[signal][status] ?? status;
}
