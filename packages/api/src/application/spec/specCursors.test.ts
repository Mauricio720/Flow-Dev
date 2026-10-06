import { describe, expect, it } from "vitest";
import { assertCurrentFence, stopNeedsAttention } from "../services/spec/specWorkerRules";
import { decodeTaskCursor, encodeTaskCursor } from "../pagination/taskCursor";

describe("cursors and fences", () => {
  const cursor = { kind: "spec_events" as const, scope: "W1", position: "9", direction: "after" as const };
  it("UT-071 decodes a signed cursor for its scope and direction", () => {
    process.env.TASK_CURSOR_SECRET = "unit-secret";
    expect(decodeTaskCursor(encodeTaskCursor(cursor), "spec_events", "W1", "after")).toMatchObject({ position: "9" });
  });
  it("UT-072 rejects tampered, foreign-scope and wrong-direction cursors", () => {
    process.env.TASK_CURSOR_SECRET = "unit-secret";
    const value = encodeTaskCursor(cursor);
    expect(() => decodeTaskCursor(`${value}x`, "spec_events", "W1", "after")).toThrow(expect.objectContaining({ reason: "invalid_cursor" }));
    expect(() => decodeTaskCursor(value, "spec_events", "W2", "after")).toThrow(expect.objectContaining({ reason: "invalid_cursor" }));
    expect(() => decodeTaskCursor(value, "spec_events", "W1", "before")).toThrow(expect.objectContaining({ reason: "invalid_cursor" }));
  });
  it("UT-015 and UT-016 apply a result only under its own fence", () => {
    expect(() => assertCurrentFence(7, 7)).not.toThrow();
    expect(() => assertCurrentFence(6, 7)).toThrow(expect.objectContaining({ reason: "stale_execution" }));
  });
  it("flags a stop that stays unverified for a minute", () => {
    const requested = new Date("2026-10-05T10:00:00Z");
    expect(stopNeedsAttention(requested, new Date("2026-10-05T10:00:59Z"))).toBe(false);
    expect(stopNeedsAttention(requested, new Date("2026-10-05T10:01:01Z"))).toBe(true);
  });
});

