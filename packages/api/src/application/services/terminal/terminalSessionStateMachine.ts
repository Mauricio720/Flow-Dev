import type { TerminalEventKind } from "../../terminal/terminalEventKind";
import { isActiveSession, type TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import { UNCONFIRMED_AFTER_MS } from "./terminalSessionTiming";

type Transitions = Partial<Record<TerminalEventKind, TerminalSessionStatus>>;

const WORK_SIGNALS: Transitions = { started: "running", prompt: "running", skill: "running", file_edit: "running", command: "running", ended: "ended" };

const TRANSITIONS: Record<TerminalSessionStatus, Transitions> = {
  opening: WORK_SIGNALS,
  unconfirmed: WORK_SIGNALS,
  waiting: WORK_SIGNALS,
  running: { waiting: "waiting", attention: "waiting", ended: "ended" },
  ended: {},
  launch_failed: {},
};

export function applyTerminalEvent(status: TerminalSessionStatus, kind: TerminalEventKind): TerminalSessionStatus | null {
  if (!isActiveSession(status)) return null;
  return TRANSITIONS[status][kind] ?? status;
}

export function expireUnconfirmed(input: { status: TerminalSessionStatus; openedAt: Date; now: Date }): TerminalSessionStatus {
  if (input.status !== "opening") return input.status;
  const waitedMs = input.now.getTime() - input.openedAt.getTime();
  return waitedMs > UNCONFIRMED_AFTER_MS ? "unconfirmed" : input.status;
}
