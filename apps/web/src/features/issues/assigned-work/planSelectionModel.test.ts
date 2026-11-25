import { describe, expect, it } from "vitest";
import type { EditableItem, EditablePlan } from "./planContract";
import { createSessionWith, placeOf, setSessionTasks } from "./planSelectionModel";

const OPUS_MAX = { agent: "claude", model: "opus", effort: "max" } as const;
const HAIKU_LOW = { agent: "claude", model: "haiku", effort: "low" } as const;

const session = (key: string, taskIds: string[], patch: Partial<EditableItem> = {}): EditableItem => ({ key, id: key, taskIds, choice: OPUS_MAX, started: false, ...patch });
const planOf = (items: EditableItem[]): EditablePlan => ({ version: 3, items });
const taskLists = (plan: EditablePlan) => plan.items.map((item) => [item.key, item.taskIds]);

describe("planSelectionModel setSessionTasks", () => {
  it("V-01a leaves the session with exactly the chosen tasks in number order, frees the unchosen one and keeps every choice", () => {
    const plan = planOf([session("S1", ["task_01", "task_03"], { choice: HAIKU_LOW }), session("S2", ["task_02", "task_04"])]);
    const result = setSessionTasks(plan, { key: "S1", taskIds: ["task_04", "task_01"] });
    expect(taskLists(result)).toEqual([["S1", ["task_01", "task_04"]], ["S2", ["task_02"]]]);
    expect(result.items.map((item) => item.choice)).toEqual([HAIKU_LOW, OPUS_MAX]);
    expect(result.items.flatMap((item) => item.taskIds)).not.toContain("task_03");
  });

  it("V-01b drops the other session when taking its only task leaves it empty", () => {
    const plan = planOf([session("S1", ["task_01"]), session("S2", ["task_02"])]);
    expect(taskLists(setSessionTasks(plan, { key: "S1", taskIds: ["task_02", "task_01"] }))).toEqual([["S1", ["task_01", "task_02"]]]);
  });

  it("V-01c removes the session itself when no task is chosen", () => {
    const plan = planOf([session("S1", ["task_01", "task_03"])]);
    expect(setSessionTasks(plan, { key: "S1", taskIds: [] }).items).toEqual([]);
  });

  it("V-01d returns the same plan when the target session was started", () => {
    const plan = planOf([session("S1", ["task_01"], { started: true }), session("S2", ["task_02"])]);
    expect(setSessionTasks(plan, { key: "S1", taskIds: ["task_01", "task_03"] })).toBe(plan);
  });

  it("V-01e does not take a task out of a started session", () => {
    const plan = planOf([session("S1", ["task_01"], { started: true }), session("S2", ["task_02"])]);
    expect(taskLists(setSessionTasks(plan, { key: "S2", taskIds: ["task_01", "task_02"] }))).toEqual([["S1", ["task_01"]], ["S2", ["task_02"]]]);
  });

  it("V-01f lists a task given twice only once", () => {
    const plan = planOf([session("S1", ["task_01"])]);
    expect(taskLists(setSessionTasks(plan, { key: "S1", taskIds: ["task_03", "task_01", "task_03"] }))).toEqual([["S1", ["task_01", "task_03"]]]);
  });
});

describe("planSelectionModel placeOf", () => {
  it("V-01g keeps the plan when the session key no longer exists", () => {
    const plan = planOf([session("S1", ["task_01"])]);
    expect(setSessionTasks(plan, { key: "gone", taskIds: ["task_02"] })).toBe(plan);
  });

  it("V-01g tells where each task is, whether its session was started, and that an unplanned task has no place", () => {
    const plan = planOf([session("S1", ["task_01"], { started: true }), session("S2", ["task_02"])]);
    expect(placeOf(plan, "task_01")).toEqual({ kind: "item", key: "S1", position: 1, started: true });
    expect(placeOf(plan, "task_02")).toEqual({ kind: "item", key: "S2", position: 2, started: false });
    expect(placeOf(plan, "task_04")).toEqual({ kind: "none" });
  });
});

describe("planSelectionModel createSessionWith", () => {
  it("V-01h adds the new session last with the chosen tasks in order, in Opus and Maximum, without an id, and frees them from where they were", () => {
    const plan = planOf([session("S1", ["task_01", "task_03"]), session("S2", ["task_02"], { choice: HAIKU_LOW })]);
    const result = createSessionWith(plan, ["task_03", "task_02"]);
    expect(taskLists(result).slice(0, 1)).toEqual([["S1", ["task_01"]]]);
    expect(result.items).toHaveLength(2);
    const created = result.items[1]!;
    expect(created.taskIds).toEqual(["task_02", "task_03"]);
    expect(created.started).toBe(false);
    expect(created.choice).toEqual(OPUS_MAX);
    expect(created.id).toBeUndefined();
  });

  it("V-01i creates the only session of an empty plan with both tasks in Opus and Maximum", () => {
    const result = createSessionWith(planOf([]), ["task_01", "task_02"]);
    expect(result.items.map((item) => [item.taskIds, item.choice, item.started])).toEqual([[["task_01", "task_02"], OPUS_MAX, false]]);
  });

  it("V-01j returns the same plan when no task is chosen", () => {
    const plan = planOf([session("S1", ["task_01"])]);
    expect(createSessionWith(plan, [])).toBe(plan);
  });

  it("V-01j leaves out a task of a started session and does not change that session", () => {
    const plan = planOf([session("S1", ["task_01"], { started: true })]);
    const result = createSessionWith(plan, ["task_01", "task_02"]);
    expect(result.items.map((item) => item.taskIds)).toEqual([["task_01"], ["task_02"]]);
    expect(result.items[0]).toBe(plan.items[0]);
  });

  it("V-01k gives the new session a key different from every existing one, including an unsaved new session", () => {
    const plan = planOf([session("new-1", ["task_01"], { id: undefined }), session("S2", ["task_02"])]);
    const result = createSessionWith(plan, ["task_04"]);
    const keys = result.items.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(result.items.at(-1)!.key).not.toBe("new-1");
  });
});
