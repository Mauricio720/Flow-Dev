import { describe, expect, it } from "vitest";
import { storedItem, taskSetOf } from "./planFixture";
import { itemReadiness, remainingTasks } from "./planReadiness";
import type { StoredPlanItem } from "./planTypes";

const edges: Array<[string, string]> = [["task_01", "task_02"]];
const sessionOf = (status: "running" | "ended" | "launch_failed"): StoredPlanItem["latestSession"] => ({ id: "session-1", status });

describe("itemReadiness", () => {
  it("V-35g is ready when the dependency outside the item is completed, and blocked, naming the task and status, when it is open", () => {
    const item = storedItem({ id: "a", taskIds: ["task_02"] });
    expect(itemReadiness(item, taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "completed" } }))).toEqual({ state: "ready", blockedBy: [] });
    const open = itemReadiness(item, taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "in_progress" } }));
    expect(open).toEqual({ state: "blocked", blockedBy: [{ taskId: "task_01", status: "in_progress" }] });
  });

  it("V-35g ignores a dependency that is inside the same item", () => {
    const item = storedItem({ id: "a", taskIds: ["task_01", "task_02"] });
    expect(itemReadiness(item, taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "pending" } }))).toEqual({ state: "ready", blockedBy: [] });
  });

  it("V-35h is running while the latest session is active, ended when it ended with open tasks, and done when every task is completed", () => {
    const set = taskSetOf({ ids: ["task_01", "task_02"], statuses: { task_01: "completed" } });
    expect(itemReadiness(storedItem({ id: "a", taskIds: ["task_01", "task_02"], started: true, latestSession: sessionOf("running") }), set).state).toBe("running");
    expect(itemReadiness(storedItem({ id: "a", taskIds: ["task_01", "task_02"], started: true, latestSession: sessionOf("ended") }), set).state).toBe("ended");
    const allDone = taskSetOf({ ids: ["task_01", "task_02"], statuses: { task_01: "completed", task_02: "completed" } });
    expect(itemReadiness(storedItem({ id: "a", taskIds: ["task_01", "task_02"], started: true, latestSession: sessionOf("running") }), allDone).state).toBe("done");
  });

  it("V-35i stays ended, with the open dependency in blockedBy, when the dependency outside the item is still open", () => {
    const item = storedItem({ id: "a", taskIds: ["task_02"], started: true, latestSession: sessionOf("ended") });
    const set = taskSetOf({ ids: ["task_01", "task_02"], edges, statuses: { task_01: "pending" } });
    expect(itemReadiness(item, set)).toEqual({ state: "ended", blockedBy: [{ taskId: "task_01", status: "pending" }] });
  });

  it("V-35j treats an item whose only session failed to open as not started, and still ready", () => {
    const item = storedItem({ id: "a", taskIds: ["task_01"], started: false, latestSession: sessionOf("launch_failed") });
    expect(itemReadiness(item, taskSetOf({ ids: ["task_01"] }))).toEqual({ state: "ready", blockedBy: [] });
  });

  it("goes back to ended when a new session of an item that already ran fails to open", () => {
    const item = storedItem({ id: "a", taskIds: ["task_01"], started: true, latestSession: sessionOf("launch_failed") });
    expect(itemReadiness(item, taskSetOf({ ids: ["task_01"] })).state).toBe("ended");
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
