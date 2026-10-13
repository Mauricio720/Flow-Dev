import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { ActionRecord, PlanRecord, TaskFlowDao } from "../../database/dao/taskFlowDao";
import { implementationConcluded, isReviewLoop } from "./loopOrder";
import { TaskFlowError } from "./taskFlowErrors";
import type { TaskScope } from "./taskFlowPorts";
import { refreshTaskFlowPlanStatus } from "./taskFlowRunFinalization";

export type ConcludeReviewInput = { actionId: string; expectedRevision: number };
export type ConclusionResult = { actionId: string; state: string; concludedAt: Date };

const SUCCEEDED_STATE = "succeeded";
const CONCLUDABLE_STATES = ["failed", "canceled", "blocked"];
const IDLE_STATES = ["planned", SUCCEEDED_STATE];

export class TaskFlowConclusion {
  constructor(private readonly unit: FlowUnitOfWork, private readonly clock: () => Date = () => new Date()) {}

  conclude(scope: TaskScope, input: ConcludeReviewInput): Promise<ConclusionResult> {
    return this.unit.run(async ({ flow }) => {
      await flow.lockTask(scope.taskId);
      await flow.assertWorkScope?.(scope);
      const plan = await flow.plans.lock(scope.taskId);
      if (!plan) throw new TaskFlowError("action_unavailable");
      const action = plan.actions.find((candidate) => candidate.id === input.actionId);
      if (!action || !isReviewLoop(action)) throw new TaskFlowError("action_unavailable");
      if (action.concludedAt) return { actionId: action.id, state: action.state, concludedAt: action.concludedAt };
      if (plan.revision !== input.expectedRevision) throw new TaskFlowError("plan_version_changed", { revision: plan.revision });
      await assertConcludable(flow, plan, action);
      const now = this.clock();
      await flow.plans.concludeAction({ actionId: action.id, actorId: scope.actorId, now });
      await refreshTaskFlowPlanStatus(flow, scope.taskId);
      return { actionId: action.id, state: SUCCEEDED_STATE, concludedAt: now };
    });
  }
}

async function assertConcludable(flow: TaskFlowDao, plan: PlanRecord, action: ActionRecord) {
  if (!CONCLUDABLE_STATES.includes(action.state)) throw new TaskFlowError(IDLE_STATES.includes(action.state) ? "action_unavailable" : "action_active");
  if (await flow.runs.activeWrite(plan.taskId)) throw new TaskFlowError("action_active");
  const earlier = plan.actions.filter((candidate) => candidate.position < action.position);
  if (!implementationConcluded(earlier)) throw new TaskFlowError("stage_prerequisite");
}
