import { describe, expect, it } from "vitest";
import { OPUS_MAX, draftOf, storedItem, taskSetOf } from "./planFixture";
import { validatePlan } from "./planRules";

const CHAIN = taskSetOf({ ids: ["task_01", "task_02", "task_03"], edges: [["task_01", "task_02"]] });
const FLAT = taskSetOf({ ids: ["task_01", "task_02", "task_03"] });
const THIRTY_IDS = Array.from({ length: 30 }, (_, index) => `task_${String(index + 1).padStart(2, "0")}`);

describe("validatePlan with empty sessions and conditions", () => {
  it("V-01a accepts a session without tasks next to a session with a task", () => {
    expect(validatePlan({ set: FLAT, stored: [], drafts: [draftOf([]), draftOf(["task_01"])] })).toEqual({ items: [{ taskIds: [], choice: OPUS_MAX, after: [] }, { taskIds: ["task_01"], choice: OPUS_MAX, after: [] }] });
  });

  it("V-01b accepts a session that starts after an earlier one and keeps the position", () => {
    const result = validatePlan({ set: FLAT, stored: [], drafts: [draftOf(["task_01"]), draftOf(["task_02"]), draftOf(["task_03"], { after: [1] })] });
    expect(result).toMatchObject({ items: [{ after: [] }, { after: [] }, { after: [1] }] });
  });

  it("V-01c refuses a session that starts after a later one, naming both sessions", () => {
    const result = validatePlan({ set: FLAT, stored: [], drafts: [draftOf(["task_01"]), draftOf(["task_02"], { after: [3] }), draftOf(["task_03"])] });
    expect(result).toEqual({ error: "plan_after_order", message: "A Sessão 2 começa depois da Sessão 3, que vem depois dela na ordem." });
  });

  it("V-01d refuses a session that starts after itself or after a position that does not exist", () => {
    expect(validatePlan({ set: FLAT, stored: [], drafts: [draftOf(["task_01"], { after: [1] })] })).toMatchObject({ error: "plan_after_order" });
    expect(validatePlan({ set: FLAT, stored: [], drafts: [draftOf(["task_01"]), draftOf(["task_02"], { after: [9] })] })).toMatchObject({ error: "plan_after_order" });
  });

  it("V-01e keeps refusing a task placed before its dependency, even with empty sessions around", () => {
    const result = validatePlan({ set: CHAIN, stored: [], drafts: [draftOf(["task_02"]), draftOf([]), draftOf(["task_01"])] });
    expect(result).toEqual({ error: "plan_invalid_order", message: "A tarefa 02 depende da 01, que está numa sessão posterior." });
  });

  it("V-01f refuses to change the condition of a started session, and 31 tasks in one session", () => {
    const first = storedItem({ id: "item-1", taskIds: ["task_01"], started: true });
    const second = storedItem({ id: "item-2", taskIds: ["task_02"], position: 2, started: true, after: ["item-1"] });
    const kept = [draftOf(["task_01"], { id: "item-1" }), draftOf(["task_02"], { id: "item-2", after: [1] })];
    expect(validatePlan({ set: FLAT, stored: [first, second], drafts: kept })).toMatchObject({ items: [{ id: "item-1" }, { id: "item-2", after: [1] }] });
    const changed = [draftOf(["task_01"], { id: "item-1" }), draftOf(["task_02"], { id: "item-2", after: [] })];
    expect(validatePlan({ set: FLAT, stored: [first, second], drafts: changed })).toEqual({ error: "plan_item_started" });
    const set = taskSetOf({ ids: [...THIRTY_IDS, "task_31"] });
    expect(validatePlan({ set, stored: [], drafts: [draftOf([...THIRTY_IDS, "task_31"])] })).toEqual({ error: "plan_limits" });
  });
});
