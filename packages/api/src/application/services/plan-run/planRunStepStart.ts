import type { PlanRunDao, PlanRunRecord } from "../../database/dao/planRunDao";
import type { SessionLauncher } from "../terminal/sessionLauncher";
import { buildExecutionPrompt } from "../terminal/taskPlanPrompts";
import type { PlanLog } from "../tasks-set/planLog";
import { remainingTasks } from "../tasks-set/planReadiness";
import type { PlanItemView } from "../tasks-set/planView";
import type { TaskSet } from "../tasks-set/taskSetTypes";
import { launchFailureMessage } from "./planRunLaunchMessage";
import type { PlanRunPauser } from "./planRunPauser";
import { launchRefusedMessage } from "./planRunPauseReasons";
import { planRunOpenRequestKey } from "./planRunRequestKeys";

export type PlanRunStartDeps = { runs: Pick<PlanRunDao, "transition">; launcher: Pick<SessionLauncher, "launch">; pauser: Pick<PlanRunPauser, "pause">; log: PlanLog };
export type PlanRunStartTarget = { item: PlanItemView; position: number; set: TaskSet };

const RUNNING = "running" as const;

export class PlanRunStepStart {
  constructor(private readonly deps: PlanRunStartDeps) {}

  async start(run: PlanRunRecord, target: PlanRunStartTarget) {
    const claimed = await this.deps.runs.transition({ runId: run.id, revision: run.revision, next: { state: RUNNING, currentItemId: target.item.id, currentSessionId: null } });
    if (!claimed) return;
    const launched = await this.launch(claimed, target);
    if (!launched) return;
    await this.deps.runs.transition({ runId: claimed.id, revision: claimed.revision, next: { state: RUNNING, currentItemId: target.item.id, currentSessionId: launched.session.id } });
    this.deps.log.runSessionStarted({ taskId: run.taskId, runId: run.id, item: target.item.id, session: launched.session.id, agent: target.item.choice.agent, model: target.item.choice.model });
  }

  private async launch(run: PlanRunRecord, { item, position, set }: PlanRunStartTarget) {
    const requestKey = planRunOpenRequestKey({ runId: run.id, itemId: item.id, resumeCount: run.resumeCount });
    try {
      return await this.deps.launcher.launch({ actorId: run.startedBy, taskId: run.taskId, projectId: run.projectId, requestKey, purpose: "plan_item", planItemId: item.id, choice: item.choice, prompt: promptOf(item, set) });
    } catch (error) {
      await this.deps.pauser.pause(run, { code: "launch_refused", reason: launchRefusedMessage(position, launchFailureMessage(error)), itemId: item.id });
      return null;
    }
  }
}

function promptOf(item: PlanItemView, set: TaskSet) {
  const paths = remainingTasks(item, set).flatMap((taskId) => set.tasks.find((task) => task.id === taskId)?.path ?? []);
  return buildExecutionPrompt({ folder: set.folder, taskPaths: paths });
}
