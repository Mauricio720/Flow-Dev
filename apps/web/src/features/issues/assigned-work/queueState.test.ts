import { describe, expect, it } from "vitest";
import { queueItemOf, queuePageOf } from "@/test/work";
import { initialQueueState, queueReducer } from "./queueState";

describe("queue state", () => {
  it("UT-020 keeps one row per issue node when a later page repeats it", () => {
    const first = initialQueueState({ kind: "ready", page: queuePageOf([queueItemOf()], { nextCursor: "c1" }) });
    const next = queueReducer(first, { type: "loaded", replace: false, page: queuePageOf([queueItemOf(), queueItemOf({ issueNodeId: "I_2" })]) });
    expect(next.items.map((item) => item.issueNodeId)).toEqual(["I_kwDOAAA", "I_2"]);
  });

  it("replaces the list on a refresh and clears a previous failure", () => {
    const failed = queueReducer(initialQueueState({ kind: "ready", page: queuePageOf([queueItemOf()]) }), { type: "failed", failure: { code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" } });
    const next = queueReducer(failed, { type: "loaded", replace: true, page: queuePageOf([queueItemOf({ issueNodeId: "I_3" })]) });
    expect(next).toMatchObject({ failure: null, busy: false, items: [{ issueNodeId: "I_3" }] });
  });

  it("keeps the continuation when a scan page has no eligible item", () => {
    const state = initialQueueState({ kind: "ready", page: queuePageOf([], { availability: "scan_continuing", nextCursor: "c2" }) });
    expect(state).toMatchObject({ items: [], nextCursor: "c2", availability: "scan_continuing" });
  });
});
