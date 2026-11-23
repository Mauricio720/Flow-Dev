import { describe, expect, it } from "vitest";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import { applyTerminalEvent } from "./terminalSessionStateMachine";
import { SESSION_SIGNALS, applySessionSignal, type SessionSignal } from "./sessionSignals";

const ACTIVE: TerminalSessionStatus[] = ["opening", "unconfirmed", "running", "asking", "waiting", "interrupted"];
const SPEC_TABLE: Array<[TerminalSessionStatus, SessionSignal, TerminalSessionStatus]> = [
  ["opening", "work", "running"],
  ["unconfirmed", "work", "running"],
  ["waiting", "work", "running"],
  ["interrupted", "work", "running"],
  ["running", "request_opened", "asking"],
  ["asking", "requests_settled", "running"],
  ["running", "turn_ended", "waiting"],
  ["asking", "turn_ended", "waiting"],
  ["running", "interrupted", "waiting"],
  ["asking", "interrupted", "waiting"],
  ["waiting", "orphaned", "interrupted"],
  ["asking", "orphaned", "interrupted"],
  ["opening", "orphaned", "interrupted"],
  ["running", "orphaned", "interrupted"],
  ["asking", "ended", "ended"],
  ["interrupted", "ended", "ended"],
  ["waiting", "ended", "ended"],
];

describe("session signals", () => {
  it.each(SPEC_TABLE)("V-21a moves %s to the spec destination on %s", (from, signal, to) => {
    expect(applySessionSignal(from, signal)).toBe(to);
  });

  it("V-21b ignores every signal in the final states", () => {
    for (const status of ["ended", "launch_failed"] as const) for (const signal of SESSION_SIGNALS) expect(applySessionSignal(status, signal)).toBeNull();
  });

  it("V-21c leaves asking only when every request is settled", () => {
    expect(applySessionSignal("asking", "requests_settled")).toBe("running");
    expect(applySessionSignal("asking", "work")).toBe("asking");
  });

  it("keeps the status for a signal that does not apply, such as an interruption without a turn in progress", () => {
    expect(applySessionSignal("waiting", "interrupted")).toBe("waiting");
    expect(applySessionSignal("interrupted", "turn_ended")).toBe("interrupted");
    expect(applySessionSignal("running", "requests_settled")).toBe("running");
  });

  it("V-21a never moves an active session back to opening, unconfirmed or launch_failed", () => {
    for (const status of ACTIVE) for (const signal of SESSION_SIGNALS) {
      const next = applySessionSignal(status, signal);
      if (next === status) continue;
      expect(next).not.toBe("opening");
      expect(next).not.toBe("unconfirmed");
      expect(next).not.toBe("launch_failed");
    }
  });

  it("V-21a routes the hook events of the Flow Dev statuses through the existing machine", () => {
    expect(applyTerminalEvent("asking", "waiting")).toBe("waiting");
    expect(applyTerminalEvent("asking", "ended")).toBe("ended");
    expect(applyTerminalEvent("asking", "command")).toBe("asking");
    expect(applyTerminalEvent("interrupted", "prompt")).toBe("running");
    expect(applyTerminalEvent("interrupted", "ended")).toBe("ended");
  });
});
