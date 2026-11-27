import { describe, expect, it } from "vitest";
import { storedItem, taskSetOf } from "./planFixture";
import { itemReadiness, remainingTasks } from "./planReadiness";
import type { TaskSet } from "./taskSetTypes";
import type { StoredPlanItem } from "./planTypes";

const edges: Array<[string, string]> = [["task_01", "task_02"]];
const readinessOf = (item: StoredPlanItem, set: TaskSet, items: StoredPlanItem[] = [item]) => itemReadiness(item, { set, items });
const sessionOf = (status: "running" | "ended" | "launch_failed"): StoredPlanItem["latestSession"] => ({ id: "session-1", status });

describe("itemReadiness", () => {
  it("V-35g is ready when the dependency outside the item is completed, and blocked, naming the task and status, when it is open", () => {
    const item = storedItem({ id: "a", taskIds: ["task_02"] });
    expect(readinessOf(item, taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "completed" } }))).toEqual({ state: "ready", blockedBy: [], waitingSessions: [] });
    const open = readinessOf(item, taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "in_progress" } }));
    expect(open).toEqual({ state: "blocked", blockedBy: [{ taskId: "task_01", status: "in_progress" }], waitingSessions: [] });
  });

  it("V-35g ignores a dependency that is inside the same item", () => {
    const item = storedItem({ id: "a", taskIds: ["task_01", "task_02"] });
    expect(readinessOf(item, taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "pending" } }))).toEqual({ state: "ready", blockedBy: [], waitingSessions: [] });
  });

  it("V-35h is running while the latest session is active, ended when it ended with open tasks, and done when every task is completed", () => {
    const set = taskSetOf({ ids: ["task_01", "task_02"], statuses: { task_01: "completed" } });
    expect(readinessOf(storedItem({ id: "a", taskIds: ["task_01", "task_02"], started: true, latestSession: sessionOf("running") }), set).state).toBe("running");
    expect(readinessOf(storedItem({ id: "a", taskIds: ["task_01", "task_02"], started: true, latestSession: sessionOf("ended") }), set).state).toBe("ended");
    const allDone = taskSetOf({ ids: ["task_01", "task_02"], statuses: { task_01: "completed", task_02: "completed" } });
    expect(readinessOf(storedItem({ id: "a", taskIds: ["task_01", "task_02"], started: true, latestSession: sessionOf("running") }), allDone).state).toBe("done");
  });

  it("V-35i stays ended, with the open dependency in blockedBy, when the dependency outside the item is still open", () => {
    const item = storedItem({ id: "a", taskIds: ["task_02"], started: true, latestSession: sessionOf("ended") });
    const set = taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "pending" } });
    expect(readinessOf(item, set)).toEqual({ state: "ended", blockedBy: [{ taskId: "task_01", status: "pending" }], waitingSessions: [] });
  });

  it("V-35j treats an item whose only session failed to open as not started, and still ready", () => {
    const item = storedItem({ id: "a", taskIds: ["task_01"], started: false, latestSession: sessionOf("launch_failed") });
    expect(readinessOf(item, taskSetOf({ ids: ["task_01"] }))).toEqual({ state: "ready", blockedBy: [], waitingSessions: [] });
  });

  it("goes back to ended when a new session of an item that already ran fails to open", () => {
    const item = storedItem({ id: "a", taskIds: ["task_01"], started: true, latestSession: sessionOf("launch_failed") });
    expect(readinessOf(item, taskSetOf({ ids: ["task_01"] })).state).toBe("ended");
  });
});

describe("itemReadiness with sessions", () => {
  const first = storedItem({ id: "s1", taskIds: ["task_01"] });
  const second = storedItem({ id: "s2", taskIds: ["task_02"], position: 2 });
  const third = storedItem({ id: "s3", taskIds: ["task_03"], position: 3, after: ["s1"] });
  const flat = (statuses: Record<string, "pending" | "in_progress" | "completed">) => taskSetOf({ ids: ["task_01", "task_02", "task_03"], statuses });

  it("V-02a blocks a session while a session it starts after is not completed", () => {
    expect(readinessOf(third, flat({ task_01: "pending" }), [first, second, third])).toEqual({ state: "blocked", blockedBy: [], waitingSessions: ["s1"] });
  });

  it("V-02b releases the session once every task of the earlier session is completed", () => {
    expect(readinessOf(third, flat({ task_01: "completed" }), [first, second, third])).toEqual({ state: "ready", blockedBy: [], waitingSessions: [] });
  });

  it("V-02c gives an empty session the empty state and does not count it as completed", () => {
    const empty = storedItem({ id: "s1", taskIds: [] });
    const after = storedItem({ id: "s2", taskIds: ["task_02"], position: 2, after: ["s1"] });
    const items = [empty, after];
    expect(readinessOf(empty, flat({}), items).state).toBe("empty");
    expect(readinessOf(after, flat({}), items)).toEqual({ state: "blocked", blockedBy: [], waitingSessions: ["s1"] });
  });

  it("V-02d keeps the dependent session blocked when the earlier session ended with an open task", () => {
    const ended = storedItem({ id: "s1", taskIds: ["task_01"], started: true, latestSession: sessionOf("ended") });
    const after = storedItem({ id: "s2", taskIds: ["task_02"], position: 2, after: ["s1"] });
    const items = [ended, after];
    expect(readinessOf(ended, flat({ task_01: "in_progress" }), items).state).toBe("ended");
    expect(readinessOf(after, flat({ task_01: "in_progress" }), items)).toEqual({ state: "blocked", blockedBy: [], waitingSessions: ["s1"] });
  });
});

describe("remainingTasks", () => {
  it("V-35m returns only the tasks of the item that are not completed", () => {
    const set = taskSetOf({ ids: ["task_01", "task_02"], statuses: { task_01: "completed", task_02: "in_progress" } });
    expect(remainingTasks({ taskIds: ["task_01", "task_02"] }, set)).toEqual(["task_02"]);
  });

  it("ignores a task that is no longer in the manifest", () => {
    expect(remainingTasks({ taskIds: ["task_01", "task_07"] }, taskSetOf({ ids: ["task_01"] }))).toEqual(["task_01"]);
  });
});
