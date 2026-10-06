import { describe, expect, it } from "vitest";
import { U, summaryOf } from "@/test/tasks";
import { historyPollInterval, historyReducer, initialHistoryState } from "./historyState";

const BACKGROUND_POLL_MS = 4_000;
const DRAFT_READY = summaryOf();
const PUBLISHED = summaryOf({ status: "published", version: 9 });
const GENERATING = summaryOf({ id: U, status: "generating", version: 1 });

function stateOf(...items: ReturnType<typeof summaryOf>[]) {
  return initialHistoryState({ kind: "ready", page: { items, nextCursor: null } });
}

describe("history state", () => {
  it("keeps the status observed in the open task after another task is opened", () => {
    const state = historyReducer(stateOf(DRAFT_READY), { type: "observed", task: PUBLISHED });
    expect(state.items.map((task) => task.status)).toEqual(["published"]);
  });

  it("ignores an observation older than the listed task and a late page older than the observation", () => {
    const published = stateOf(PUBLISHED);
    expect(historyReducer(published, { type: "observed", task: DRAFT_READY })).toBe(published);
    const refreshed = historyReducer(published, { type: "loaded", request: { search: "", refresh: true, background: true }, page: { items: [DRAFT_READY], nextCursor: null } });
    expect(refreshed.items.map((task) => task.status)).toEqual(["published"]);
  });

  it("polls the list only while a listed task is generating or publishing", () => {
    expect(historyPollInterval(stateOf(DRAFT_READY, PUBLISHED))).toBeNull();
    expect(historyPollInterval(stateOf(DRAFT_READY, GENERATING))).toBe(BACKGROUND_POLL_MS);
    const loading = historyReducer(stateOf(GENERATING), { type: "requested", request: { search: "" } });
    expect(historyPollInterval(loading)).toBeNull();
  });
});

describe("planning status in history", () => {
  it("UT-072 keeps the newer planning status when an older observation arrives", () => {
    const newer = summaryOf({ version: 12, status: "published", planningStatus: "review" });
    const state = initialHistoryState({ kind: "ready", page: { items: [newer], nextCursor: null } });
    const next = historyReducer(state, { type: "observed", task: { ...newer, version: 11, planningStatus: "in_progress" } });
    expect(next.items[0]).toMatchObject({ version: 12, planningStatus: "review" });
  });
});
