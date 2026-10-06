import { describe, expect, it } from "vitest";
import { acceptSnapshot, emptyEventState, reduceSpecEvents, type ReducibleEvent } from "./reduceSpecEvents";

const event = (sequence: number, overrides: Partial<ReducibleEvent> = {}): ReducibleEvent => ({ id: `E${sequence}`, sequence, attemptId: "R1", kind: "agent_message", payload: { text: `m${sequence}` }, ...overrides });

describe("reduceSpecEvents", () => {
  it("UT-039 advances the cursor over ordered events and keeps three entries", () => {
    const state = reduceSpecEvents(emptyEventState, [event(1), event(2), event(3)]);
    expect(state.cursor).toBe(3);
    expect(state.entries.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
  });

  it("UT-040 never lets an older snapshot replace a newer one", () => {
    const current = { specVersion: 3, state: "running" };
    expect(acceptSnapshot(current, { specVersion: 2, state: "queued" })).toBe(current);
    expect(acceptSnapshot(current, { specVersion: 4, state: "review" }).state).toBe("review");
    expect(acceptSnapshot(null, { specVersion: 1, state: "queued" }).specVersion).toBe(1);
  });

  it("IT-025 shows one completion and no lifecycle regression for duplicate and late events", () => {
    const completed = event(9, { kind: "lifecycle", payload: { status: "completed" } });
    const running = event(8, { kind: "lifecycle", payload: { status: "running" } });
    const state = reduceSpecEvents(reduceSpecEvents(emptyEventState, [completed]), [{ ...completed, id: "E9" }, running]);
    expect(state.entries.filter((entry) => entry.sequence === 9)).toHaveLength(1);
    expect(state.lifecycle).toEqual({ state: "completed", sequence: 9 });
  });

  it("IT-027 shows a replayed provider event once", () => {
    const once = event(1, { id: "E1" });
    const state = reduceSpecEvents(reduceSpecEvents(reduceSpecEvents(emptyEventState, [once]), [once]), [once, once]);
    expect(state.entries).toHaveLength(1);
  });

  it("keeps the cursor before a gap and fills it when the missing event arrives", () => {
    const gapped = reduceSpecEvents(emptyEventState, [event(1), event(3)]);
    expect(gapped.cursor).toBe(1);
    expect(reduceSpecEvents(gapped, [event(2)]).cursor).toBe(3);
  });

  it("joins a tool result into its call entry", () => {
    const call = event(1, { kind: "tool_call", payload: { toolCallId: "c1", text: "read" } });
    const result = event(2, { kind: "tool_result", payload: { toolCallId: "c1", text: "ok" } });
    const state = reduceSpecEvents(emptyEventState, [call, result]);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({ toolCallId: "c1", result: "ok" });
  });
});
