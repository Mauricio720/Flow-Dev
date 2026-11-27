import { describe, expect, it } from "vitest";
import { OPUS_MAX, SONNET_HIGH, draftOf, storedItem, taskSetOf } from "./planFixture";
import { validatePlan } from "./planRules";

const CHAIN = taskSetOf({ ids: ["task_01", "task_02", "task_03"], edges: [["task_01", "task_02"]] });
const FLAT = taskSetOf({ ids: ["task_01", "task_02", "task_03"] });
const THIRTY_IDS = Array.from({ length: 30 }, (_, index) => `task_${String(index + 1).padStart(2, "0")}`);

describe("validatePlan", () => {
  it("V-35a refuses a task placed in an earlier session than its dependency, with the numbers in the message", () => {
    const result = validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_02"]), draftOf(["task_01"])] });
    expect(result).toEqual({ error: "plan_invalid_order", message: "A tarefa 02 depende da 01, que está numa sessão posterior." });
  });

  it("V-35a accepts the dependency in an earlier session or left out of every session", () => {
    expect(validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_01"]), draftOf(["task_02"])] })).toMatchObject({ items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }] });
    expect(validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_02"])] })).toMatchObject({ items: [{ taskIds: ["task_02"] }] });
  });

  it("V-35b refuses a task in two sessions, or twice in one", () => {
    expect(validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_02"]), draftOf(["task_02", "task_03"])] })).toEqual({ error: "plan_task_duplicated" });
    expect(validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_03", "task_03"])] })).toEqual({ error: "plan_task_duplicated" });
  });

  it("V-35c refuses a task that is not in the current set", () => {
    expect(validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_01", "task_09"])] })).toEqual({ error: "plan_task_unknown" });
  });

  it("V-35d refuses 31 tasks in a session and 31 sessions, and accepts 30 sessions of one task", () => {
    const set = taskSetOf({ ids: THIRTY_IDS });
    const thirtyOne = [...THIRTY_IDS, "task_31"];
    expect(validatePlan({ set, stored: [], drafts: [draftOf(thirtyOne)] })).toEqual({ error: "plan_limits" });
    expect(validatePlan({ set, stored: [], drafts: thirtyOne.map((taskId) => draftOf([taskId])) })).toEqual({ error: "plan_limits" });
    const accepted = validatePlan({ set, stored: [], drafts: THIRTY_IDS.map((taskId) => draftOf([taskId])) });
    expect("items" in accepted && accepted.items).toHaveLength(30);
  });

  it("V-35e refuses to change the tasks or the model of a started item, or to leave it out", () => {
    const started = storedItem({ id: "item-1", taskIds: ["task_01"], started: true });
    const unchanged = draftOf(["task_01"], { id: "item-1" });
    expect(validatePlan({ set: CHAIN, stored: [started], drafts: [unchanged] })).toMatchObject({ items: [{ id: "item-1" }] });
    expect(validatePlan({ set: CHAIN, stored: [started], drafts: [draftOf(["task_01", "task_03"], { id: "item-1" })] })).toEqual({ error: "plan_item_started" });
    expect(validatePlan({ set: CHAIN, stored: [started], drafts: [draftOf(["task_01"], { id: "item-1", choice: SONNET_HIGH })] })).toEqual({ error: "plan_item_started" });
    expect(validatePlan({ set: CHAIN, stored: [started], drafts: [draftOf(["task_02"])] })).toEqual({ error: "plan_item_started" });
  });

  it("V-35e lets an item that was not started move, merge and change model", () => {
    const stored = [storedItem({ id: "a", taskIds: ["task_01"] }), storedItem({ id: "b", taskIds: ["task_02"], position: 2 })];
    const drafts = [draftOf(["task_02", "task_03"], { id: "b", choice: SONNET_HIGH }), draftOf(["task_01"], { id: "a" })];
    const result = validatePlan({ set: FLAT, stored, drafts });
    expect(result).toEqual({ items: [{ id: "b", taskIds: ["task_02", "task_03"], choice: SONNET_HIGH, after: [] }, { id: "a", taskIds: ["task_01"], choice: OPUS_MAX, after: [] }] });
  });

  it("keeps a task that left the manifest inside a started item, and drops ids that match no stored item", () => {
    const started = storedItem({ id: "item-1", taskIds: ["task_01", "task_07"], started: true });
    const drafts = [draftOf(["task_01", "task_07"], { id: "item-1" }), draftOf(["task_02"], { id: "ghost" })];
    const result = validatePlan({ set: CHAIN, stored: [started], drafts });
    expect(result).toMatchObject({ items: [{ id: "item-1", taskIds: ["task_01", "task_07"] }, { id: undefined, taskIds: ["task_02"] }] });
  });

  it("V-35f orders a session by dependency and then by number", () => {
    const result = (set: typeof CHAIN) => validatePlan({ set, stored: [], drafts: [draftOf(["task_03", "task_02", "task_01"])] });
    expect(result(CHAIN)).toMatchObject({ items: [{ taskIds: ["task_01", "task_02", "task_03"] }] });
    const reversed = taskSetOf({ ids: ["task_01", "task_02", "task_03"], edges: [["task_03", "task_01"]] });
    expect(result(reversed)).toMatchObject({ items: [{ taskIds: ["task_02", "task_03", "task_01"] }] });
  });
});
