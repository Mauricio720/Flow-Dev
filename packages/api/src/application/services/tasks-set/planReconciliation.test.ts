import { describe, expect, it } from "vitest";
import { OPUS_MAX, storedItem, taskSetOf } from "./planFixture";
import { reconcilePlan } from "./planReconciliation";
import type { StoredPlan, StoredPlanItem } from "./planTypes";

const SAVED_NODES = ["task_01", "task_02", "task_03"];

function planOf(items: StoredPlanItem[], overrides: Partial<StoredPlan> = {}): StoredPlan {
  return { id: "plan-1", version: 2, tasksFolder: "docs/specs/login", manifestVersion: 1, savedGraph: { nodes: SAVED_NODES, edges: [{ from: "task_01", to: "task_02" }] }, items, ...overrides };
}

describe("reconcilePlan", () => {
  it("V-35k shows a new task as unassigned, drops a removed one, removes the empty session and marks the plan stale", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_01", "task_02"] }), storedItem({ id: "b", taskIds: ["task_03"], position: 2 })]);
    const set = { ...taskSetOf({ ids: ["task_01", "task_02", "task_04"], edges: [["task_01", "task_02"]] }), manifestVersion: 2 };
    const result = reconcilePlan(plan, set);
    expect(result.items.map((item) => [item.id, item.taskIds])).toEqual([["a", ["task_01", "task_02"]]]);
    expect(result).toMatchObject({ unassigned: ["task_04"], stale: true });
  });

  it("V-35l keeps a removed task inside a started session", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_03"], started: true, choice: OPUS_MAX })]);
    const set = { ...taskSetOf({ ids: ["task_01", "task_02"], edges: [["task_01", "task_02"]] }), manifestVersion: 2 };
    expect(reconcilePlan(plan, set).items.map((item) => item.taskIds)).toEqual([["task_03"]]);
  });

  it("V-35l does not mark the plan stale when a new manifest version kept the same graph", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_01"] })]);
    const set = { ...taskSetOf({ ids: SAVED_NODES, edges: [["task_01", "task_02"]] }), manifestVersion: 5 };
    expect(reconcilePlan(plan, set).stale).toBe(false);
  });

  it("marks the plan stale when only a dependency changed", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_01"] })]);
    const set = { ...taskSetOf({ ids: SAVED_NODES, edges: [["task_01", "task_03"]] }), manifestVersion: 2 };
    expect(reconcilePlan(plan, set).stale).toBe(true);
  });

  it("treats the same manifest version as not stale, and an unreadable saved graph of an older version as stale", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_01"] })], { savedGraph: null });
    const set = taskSetOf({ ids: SAVED_NODES });
    expect(reconcilePlan(plan, set).stale).toBe(false);
    expect(reconcilePlan(plan, { ...set, manifestVersion: 2 }).stale).toBe(true);
  });

  it("marks the plan stale when the active task set lives in another folder, even with the same version and graph", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_01"] })]);
    const set = { ...taskSetOf({ ids: SAVED_NODES, edges: [["task_01", "task_02"]] }), folder: "docs/specs/other" };
    expect(reconcilePlan(plan, set).stale).toBe(true);
  });

  it("V-35n lists the tasks of no session in manifest order", () => {
    const plan = planOf([storedItem({ id: "a", taskIds: ["task_01"] }), storedItem({ id: "b", taskIds: ["task_03"], position: 2 })], { manifestVersion: 1 });
    const set = taskSetOf({ ids: ["task_01", "task_02", "task_03", "task_04"] });
    expect(reconcilePlan(plan, set).unassigned).toEqual(["task_02", "task_04"]);
  });
});
