import { describe, expect, it } from "vitest";
import { TERMINAL_EVENT_KINDS, type TerminalEventKind } from "../../terminal/terminalEventKind";
import { TERMINAL_SESSION_STATUSES, type TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import { applyTerminalEvent, expireUnconfirmed } from "./terminalSessionStateMachine";
import { silentSince } from "./terminalSessionTiming";

const WORK_KINDS: TerminalEventKind[] = ["started", "prompt", "skill", "file_edit", "command"];
const BEFORE_WORK: TerminalSessionStatus[] = ["opening", "unconfirmed", "waiting"];
const OPENED_AT = new Date("2026-11-22T10:00:00Z");
const after = (ms: number) => new Date(OPENED_AT.getTime() + ms);

describe("terminal session state machine", () => {
  it("V-05a moves opening, unconfirmed and waiting to running on any work signal", () => {
    for (const status of BEFORE_WORK) for (const kind of WORK_KINDS) expect(applyTerminalEvent(status, kind)).toBe("running");
  });

  it("V-05b moves running to waiting on waiting or attention", () => {
    expect(applyTerminalEvent("running", "waiting")).toBe("waiting");
    expect(applyTerminalEvent("running", "attention")).toBe("waiting");
  });

  it("V-05c expires only an opening session after more than 60 seconds", () => {
    expect(expireUnconfirmed({ status: "opening", openedAt: OPENED_AT, now: after(60_001) })).toBe("unconfirmed");
    expect(expireUnconfirmed({ status: "opening", openedAt: OPENED_AT, now: after(59_999) })).toBe("opening");
    expect(expireUnconfirmed({ status: "running", openedAt: OPENED_AT, now: after(7_200_000) })).toBe("running");
  });

  it("V-05d ends every active session on ended", () => {
    for (const status of ["opening", "running", "waiting", "unconfirmed"] as const) expect(applyTerminalEvent(status, "ended")).toBe("ended");
  });

  it("V-05e discards any event after a final state", () => {
    for (const status of ["ended", "launch_failed"] as const) for (const kind of TERMINAL_EVENT_KINDS) expect(applyTerminalEvent(status, kind)).toBeNull();
  });

  it("V-05f accepts the first signal after the unconfirmed deadline", () => {
    expect(applyTerminalEvent("unconfirmed", "prompt")).toBe("running");
  });

  it("V-05g never leads to launch_failed or opening", () => {
    for (const status of TERMINAL_SESSION_STATUSES) for (const kind of TERMINAL_EVENT_KINDS) {
      const next = applyTerminalEvent(status, kind);
      expect(next).not.toBe("launch_failed");
      if (status !== "opening") expect(next).not.toBe("opening");
    }
  });

  it("V-05h keeps the state for combinations outside the table", () => {
    expect(applyTerminalEvent("opening", "waiting")).toBe("opening");
    expect(applyTerminalEvent("waiting", "attention")).toBe("waiting");
    expect(applyTerminalEvent("running", "file_edit")).toBe("running");
  });

  it("returns the silence start only for an active session silent for 30 minutes", () => {
    const lastSignalAt = new Date("2026-11-22T10:00:00Z");
    const at = (minutes: number) => new Date(lastSignalAt.getTime() + minutes * 60_000);
    expect(silentSince({ status: "waiting", lastSignalAt, now: at(31) })).toEqual(lastSignalAt);
    expect(silentSince({ status: "waiting", lastSignalAt, now: at(29) })).toBeNull();
    expect(silentSince({ status: "ended", lastSignalAt, now: at(120) })).toBeNull();
  });
});
