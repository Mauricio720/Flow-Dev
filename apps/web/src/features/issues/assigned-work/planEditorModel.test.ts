import { describe, expect, it } from "vitest";
import type { EditableItem, EditablePlan } from "./planContract";
import { allInOne, assignedIds, moveTask, onePerTask, sameChoiceForAll, sessionOf, setChoice, toSaveInput } from "./planEditorModel";

const OPUS_MAX = { agent: "claude", model: "opus", effort: "max" } as const;
const HAIKU_MEDIUM = { agent: "claude", model: "haiku", effort: "medium" } as const;
const SONNET_HIGH = { agent: "claude", model: "sonnet", effort: "high" } as const;
const TASKS = ["task_01", "task_02", "task_03"];

const item = (key: string, taskIds: string[], patch: Partial<EditableItem> = {}): EditableItem => ({ key, id: key, taskIds, choice: OPUS_MAX, started: false, after: [], ...patch });
const planOf = (items: EditableItem[]): EditablePlan => ({ version: 4, items });
const summary = (plan: EditablePlan) => plan.items.map((entry) => [entry.started, entry.taskIds, entry.choice.model, entry.choice.effort]);

describe("planEditorModel", () => {
  it("V-35o redoes the sessions that were not started with every task that is not in a started session, leaving the started one intact", () => {
    const plan = planOf([item("a", ["task_01"], { started: true }), item("b", ["task_02"])]);
    expect(summary(allInOne(plan, TASKS))).toEqual([[true, ["task_01"], "opus", "max"], [false, ["task_02", "task_03"], "opus", "max"]]);
  });

  it("V-35p makes one session per task, each in Claude Code, Opus and Maximum, when there is no plan", () => {
    expect(summary(onePerTask(planOf([]), TASKS))).toEqual([[false, ["task_01"], "opus", "max"], [false, ["task_02"], "opus", "max"], [false, ["task_03"], "opus", "max"]]);
  });

  it("V-35p keeps the started session and gives the other tasks a session each", () => {
    const plan = planOf([item("a", ["task_02"], { started: true, choice: SONNET_HIGH })]);
    expect(summary(onePerTask(plan, TASKS))).toEqual([[true, ["task_02"], "sonnet", "high"], [false, ["task_01"], "opus", "max"], [false, ["task_03"], "opus", "max"]]);
  });

  it("V-35q applies the same choice only to the sessions that were not started", () => {
    const plan = planOf([item("a", ["task_01"], { started: true }), item("b", ["task_02"]), item("c", ["task_03"])]);
    expect(summary(sameChoiceForAll(plan, HAIKU_MEDIUM))).toEqual([[true, ["task_01"], "opus", "max"], [false, ["task_02"], "haiku", "medium"], [false, ["task_03"], "haiku", "medium"]]);
  });

  it("V-07b moves a task out of its session and keeps the session, now empty, in the draft", () => {
    const plan = planOf([item("a", ["task_01"]), item("b", ["task_02"]), item("c", ["task_03"])]);
    const unassigned = moveTask(plan, "task_02", { kind: "none" });
    expect(unassigned.items.map((entry) => entry.taskIds)).toEqual([["task_01"], [], ["task_03"]]);
    expect(assignedIds(unassigned).has("task_02")).toBe(false);
    expect(moveTask(unassigned, "task_02", { kind: "item", key: "b" }).items.map((entry) => entry.taskIds)).toEqual([["task_01"], ["task_02"], ["task_03"]]);
  });

  it("V-07c moves a task between sessions keeping the tasks in number order, and does not touch a started session", () => {
    const plan = planOf([item("a", ["task_02"]), item("b", ["task_01", "task_03"]), item("s", ["task_09"], { started: true })]);
    const moved = moveTask(plan, "task_01", { kind: "item", key: "a" });
    expect(moved.items.map((entry) => entry.taskIds)).toEqual([["task_01", "task_02"], ["task_03"], ["task_09"]]);
    expect(moveTask(plan, "task_09", { kind: "none" })).toBe(plan);
    expect(moveTask(plan, "task_01", { kind: "item", key: "s" })).toBe(plan);
  });

  it("finds the session of a task and changes the choice of one session that was not started", () => {
    const plan = planOf([item("a", ["task_01"], { started: true }), item("b", ["task_02"])]);
    expect(sessionOf(plan, "task_02")).toEqual({ kind: "item", key: "b" });
    expect(sessionOf(plan, "task_03")).toEqual({ kind: "none" });
    expect(setChoice(plan, { key: "b", choice: SONNET_HIGH }).items[1]!.choice).toEqual(SONNET_HIGH);
    expect(setChoice(plan, { key: "a", choice: SONNET_HIGH }).items[0]!.choice).toEqual(OPUS_MAX);
  });

  it("keeps the selected Codex model id and effort in the plan save payload", () => {
    const plan = planOf([item("a", ["task_01"])]);
    const choice = { agent: "codex", model: "gpt-6.1-sol", effort: "high" } as const;
    const changed = setChoice(plan, { key: "a", choice });
    expect(toSaveInput(changed).items[0]?.choice).toEqual(choice);
  });

  it("builds the save input with the version that was read, the ids of the saved sessions and none for the new ones", () => {
    const plan = planOf([item("a", ["task_01"]), { key: "new-1", taskIds: ["task_02"], choice: SONNET_HIGH, started: false, after: [] }]);
    expect(toSaveInput(plan)).toEqual({ version: 4, items: [{ id: "a", taskIds: ["task_01"], choice: OPUS_MAX, after: [] }, { taskIds: ["task_02"], choice: SONNET_HIGH, after: [] }] });
  });
});
