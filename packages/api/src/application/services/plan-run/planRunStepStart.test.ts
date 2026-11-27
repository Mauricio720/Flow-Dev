import { describe, expect, it, vi } from "vitest";
import type { PlanRunRecord } from "../../database/dao/planRunDao";
import { SESSION_SERVICE_OFFLINE_MESSAGE } from "../terminal/terminalErrorCatalog";
import { TaskError } from "../tasks/taskErrors";
import { storedItem, taskSetOf } from "../tasks-set/planFixture";
import type { PlanLog } from "../tasks-set/planLog";
import { buildPlanView } from "../tasks-set/planView";
import { PlanRunStepStart } from "./planRunStepStart";

const RUN: PlanRunRecord = { id: "run-1", planId: "plan", taskId: "task", projectId: "project", hostId: "host", startedBy: "ana", state: "running", pauseReason: null, pausedBy: null, pausedByName: null, currentItemId: null, currentSessionId: null, resumeCount: 0, revision: 4, requestKey: "key" };
const log = { runSessionStarted: vi.fn() } as unknown as PlanLog;

function target() {
  const set = taskSetOf({ ids: ["task_01", "task_02"] });
  const plan = { id: "plan", version: 1, tasksFolder: set.folder, manifestVersion: 1, savedGraph: null, items: [storedItem({ id: "s1", taskIds: ["task_01"], started: true }), storedItem({ id: "s2", taskIds: ["task_02"], position: 2 })] };
  return { item: buildPlanView({ plan, set, canEdit: false, agents: [] }).items[1]!, position: 2, set };
}

describe("PlanRunStepStart", () => {
  it("V-06j pauses with the Start message for a stopped session service and does not record a session", async () => {
    const claimed = { ...RUN, revision: 5, currentItemId: "s2" };
    const runs = { transition: vi.fn().mockResolvedValueOnce(claimed) };
    const pauser = { pause: vi.fn().mockResolvedValue(null) };
    const launcher = { launch: vi.fn().mockRejectedValue(new TaskError("session_service_offline")) };
    await new PlanRunStepStart({ runs, launcher, pauser, log }).start(RUN, target());
    expect(pauser.pause).toHaveBeenCalledWith(claimed, { code: "launch_refused", reason: `Não foi possível iniciar a Sessão 2. ${SESSION_SERVICE_OFFLINE_MESSAGE}`, itemId: "s2" });
    expect(runs.transition).toHaveBeenCalledTimes(1);
  });

  it("does not launch when the run changed before the session was claimed", async () => {
    const launcher = { launch: vi.fn() };
    await new PlanRunStepStart({ runs: { transition: vi.fn().mockResolvedValue(null) }, launcher, pauser: { pause: vi.fn() }, log }).start(RUN, target());
    expect(launcher.launch).not.toHaveBeenCalled();
  });
});
