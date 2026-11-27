import { describe, expect, it } from "vitest";
import { storedItem, taskSetOf } from "./planFixture";
import type { StoredPlan } from "./planTypes";
import { buildPlanView } from "./planView";

const SET = taskSetOf({ ids: ["task_01", "task_02"], edges: [["task_01", "task_02"]] });

function planWith(items: StoredPlan["items"]): StoredPlan {
  return { id: "plan-1", version: 3, tasksFolder: SET.folder, manifestVersion: SET.manifestVersion, savedGraph: null, items };
}

describe("buildPlanView", () => {
  it("V-02f exposes the condition and the sessions and tasks a session still waits for", () => {
    const first = storedItem({ id: "s1", taskIds: ["task_01"] });
    const second = storedItem({ id: "s2", taskIds: ["task_02"], position: 2, after: ["s1"] });
    const view = buildPlanView({ plan: planWith([first, second]), set: SET, canEdit: true, agents: [] });
    expect(view.items[1]).toMatchObject({ id: "s2", state: "blocked", after: ["s1"], waitingSessions: ["s1"], blockedBy: [{ taskId: "task_01", status: "pending" }] });
    expect(view.items[0]).toMatchObject({ id: "s1", state: "ready", after: [], waitingSessions: [] });
  });

  it("keeps an empty session in the view with the empty state", () => {
    const view = buildPlanView({ plan: planWith([storedItem({ id: "s1", taskIds: [] })]), set: SET, canEdit: true, agents: [] });
    expect(view.items).toMatchObject([{ id: "s1", taskIds: [], state: "empty" }]);
    expect(view.unassigned).toEqual(["task_01", "task_02"]);
  });
});
