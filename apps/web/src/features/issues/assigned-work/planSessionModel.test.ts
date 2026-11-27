import { describe, expect, it } from "vitest";
import type { EditableItem, EditablePlan } from "./planContract";
import { allInOne, onePerTask, sameChoiceForAll, toSaveInput } from "./planEditorModel";
import { addEmptySession, moveSession, removeFromSession, removeSession, setAfter } from "./planSessionModel";

const OPUS_MAX = { agent: "claude", model: "opus", effort: "max" } as const;
const HAIKU_LOW = { agent: "claude", model: "haiku", effort: "low" } as const;
const TASKS = ["task_01", "task_02", "task_03"];

const item = (key: string, taskIds: string[], patch: Partial<EditableItem> = {}): EditableItem => ({ key, id: key, taskIds, choice: OPUS_MAX, started: false, after: [], ...patch });
const planOf = (items: EditableItem[]): EditablePlan => ({ version: 2, items });
const keys = (plan: EditablePlan) => plan.items.map((entry) => entry.key);

describe("planSessionModel", () => {
  it("V-07a adds empty sessions at the end in Opus and Maximum with distinct keys", () => {
    const plan = addEmptySession(addEmptySession(planOf([])));
    expect(plan.items.map((entry) => [entry.taskIds, entry.after, entry.choice, entry.id])).toEqual([[[], [], OPUS_MAX, undefined], [[], [], OPUS_MAX, undefined]]);
    expect(new Set(keys(plan)).size).toBe(2);
  });

  it("V-07d removes tasks from a session and keeps the session in the plan", () => {
    const plan = removeFromSession(removeFromSession(planOf([item("S1", ["task_01"]), item("S2", ["task_02", "task_03"])]), "task_02"), "task_03");
    expect(plan.items.map((entry) => [entry.key, entry.taskIds])).toEqual([["S1", ["task_01"]], ["S2", []]]);
  });

  it("V-07e removes a session, frees its tasks and drops the conditions that pointed to it", () => {
    const plan = removeSession(planOf([item("S1", ["task_01"]), item("S2", ["task_02"]), item("S3", ["task_03"], { after: ["S2"] })]), "S2");
    expect(plan.items.map((entry) => [entry.key, entry.taskIds, entry.after])).toEqual([["S1", ["task_01"], []], ["S3", ["task_03"], []]]);
    expect(removeSession(planOf([item("S1", ["task_01"], { started: true })]), "S1").items).toHaveLength(1);
  });

  it("V-07f moves a session to the top, ignores moves past the ends and never moves a started session", () => {
    const plan = planOf([item("S1", ["task_01"]), item("S2", ["task_02"]), item("S3", ["task_03"])]);
    expect(keys(moveSession(plan, { key: "S3", to: 1 }))).toEqual(["S3", "S1", "S2"]);
    expect(moveSession(plan, { key: "S1", to: 0 })).toBe(plan);
    expect(moveSession(plan, { key: "S3", to: 4 })).toBe(plan);
    const started = planOf([item("S1", ["task_01"], { started: true }), item("S2", ["task_02"])]);
    expect(moveSession(started, { key: "S1", to: 2 })).toBe(started);
  });

  it("V-07g drops a condition that would point forward after a reorder", () => {
    const plan = planOf([item("S1", ["task_01"]), item("S2", ["task_02"]), item("S3", ["task_03"], { after: ["S1", "S2"] })]);
    const moved = moveSession(plan, { key: "S3", to: 2 });
    expect(moved.items.map((entry) => [entry.key, entry.after])).toEqual([["S1", []], ["S3", ["S1"]], ["S2", []]]);
  });

  it("V-07h keeps only earlier sessions in the condition", () => {
    const plan = planOf([item("S1", ["task_01"]), item("S2", ["task_02"]), item("S3", ["task_03"])]);
    expect(setAfter(plan, { key: "S2", after: ["S1", "S3"] }).items[1]!.after).toEqual(["S1"]);
  });

  it("V-07i sends the condition as positions of the same save, and no id for new sessions", () => {
    const plan = planOf([item("S1", ["task_01"]), item("new-1", ["task_02"], { id: undefined }), item("new-2", ["task_03"], { id: undefined, after: ["S1", "new-1"] })]);
    expect(toSaveInput(plan).items).toEqual([{ id: "S1", taskIds: ["task_01"], choice: OPUS_MAX, after: [] }, { taskIds: ["task_02"], choice: OPUS_MAX, after: [] }, { taskIds: ["task_03"], choice: OPUS_MAX, after: [1, 2] }]);
  });

  it("V-07j clears the conditions of the sessions replaced by the shortcuts, and the same-model shortcut keeps them", () => {
    const plan = planOf([item("S1", ["task_01"]), item("S2", ["task_02"], { after: ["S1"] }), item("S3", ["task_03"], { after: ["S2"] })]);
    expect(allInOne(plan, TASKS).items.flatMap((entry) => entry.after)).toEqual([]);
    expect(onePerTask(plan, TASKS).items.flatMap((entry) => entry.after)).toEqual([]);
    expect(sameChoiceForAll(plan, HAIKU_LOW).items.map((entry) => entry.after)).toEqual([[], ["S1"], ["S2"]]);
  });
});
