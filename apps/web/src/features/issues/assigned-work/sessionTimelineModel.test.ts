import { describe, expect, it } from "vitest";
import { messageOf, questionOf, timelineOf } from "@/test/session";
import { EMPTY_TIMELINE, MAX_VISIBLE_ENTRIES, SESSION_POLL_MS, isFinalStatus, mergeTimeline, nextPoll, replaceTimeline } from "./sessionTimelineModel";

const at = (second: number) => new Date(Date.UTC(2026, 10, 23, 14, 0, second)).toISOString();

describe("session timeline model", () => {
  it("replaces a known entry by its id keeping its place, and appends the new ones in time order", () => {
    const first = replaceTimeline(timelineOf({ entries: [messageOf({ id: "a", at: at(1) }), questionOf({ id: "q", at: at(2), status: "pending" })] }));
    const next = mergeTimeline(first, timelineOf({ entries: [messageOf({ id: "b", at: at(5) }), questionOf({ id: "q", at: at(2), status: "answered", answers: { "Quem pode ver os comentários?": "Qualquer pessoa" } })] }));
    expect(next.entries.map((entry) => [entry.id, entry.type === "question" ? entry.status : "-"])).toEqual([["a", "-"], ["q", "answered"], ["b", "-"]]);
  });

  it("keeps the 200 most recent entries and adds the dropped ones to the hidden count", () => {
    const old = Array.from({ length: MAX_VISIBLE_ENTRIES }, (_, index) => messageOf({ id: `m${index}`, at: at(index) }));
    const merged = mergeTimeline(replaceTimeline(timelineOf({ entries: old, hiddenEntries: 3 })), timelineOf({ entries: [messageOf({ id: "new", at: at(500) }), messageOf({ id: "newer", at: at(501) })] }));
    expect(merged.entries).toHaveLength(MAX_VISIBLE_ENTRIES);
    expect(merged.entries[0]!.id).toBe("m2");
    expect(merged.entries.at(-1)!.id).toBe("newer");
    expect(merged.hiddenEntries).toBe(5);
  });

  it("takes status, control and pending requests from the latest page", () => {
    const merged = mergeTimeline(EMPTY_TIMELINE, timelineOf({ status: "asking", canControl: false, pending: { requestIds: ["q1"] } }));
    expect(merged).toMatchObject({ status: "asking", canControl: false, pendingIds: ["q1"] });
  });

  it("polls every 1.5 seconds while the session is active, refetches once in full when it becomes final and then stops", () => {
    expect(nextPoll({ final: false, full: false, cursor: "c2" })).toEqual({ cursor: "c2", delay: SESSION_POLL_MS });
    expect(SESSION_POLL_MS).toBe(1_500);
    expect(nextPoll({ final: true, full: false, cursor: "c3" })).toEqual({ cursor: undefined, delay: 0 });
    expect(nextPoll({ final: true, full: true, cursor: "c4" })).toEqual({ cursor: undefined, delay: null });
  });

  it("knows the final statuses", () => {
    expect(["ended", "launch_failed"].every(isFinalStatus)).toBe(true);
    expect(["opening", "running", "asking", "waiting", "interrupted", "unconfirmed"].some(isFinalStatus)).toBe(false);
    expect(isFinalStatus(null)).toBe(false);
  });
});
