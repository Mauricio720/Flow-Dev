import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { ActionRecord, PlanRecord, TaskFlowDao } from "../../database/dao/taskFlowDao";
import { DIRECT_PARTIAL_REASON } from "../local-execution/directOutcome";
import { isDirectAction } from "./directExecution";
import { implementationConcluded, isReviewLoop } from "./loopOrder";
import { TaskFlowError } from "./taskFlowErrors";
import type { TaskScope } from "./taskFlowPorts";
import { refreshTaskFlowPlanStatus } from "./taskFlowRunFinalization";

export type ConcludeReviewInput = { actionId: string; expectedRevision: number };
export type ConclusionResult = { actionId: string; state: string; concludedAt: Date };
export type ConclusionKind = "review" | "direct_partial";

const SUCCEEDED_STATE = "succeeded";
const CONCLUDABLE_STATES = ["failed", "canceled", "blocked"];
const IDLE_STATES = ["planned", SUCCEEDED_STATE];
const BLOCKED_STATE = "blocked";
const RUN_LOOKUP_LIMIT = 50;
const CONCLUDES: Record<ConclusionKind, { owns: (action: ActionRecord) => boolean; assert: typeof assertConcludable }> = {
  review: { owns: isReviewLoop, assert: assertConcludable },
  direct_partial: { owns: isDirectAction, assert: assertPartialAcceptable },
};

export class TaskFlowConclusion {
  constructor(private readonly unit: FlowUnitOfWork, private readonly clock: () => Date = () => new Date()) {}

  conclude(scope: TaskScope, input: ConcludeReviewInput, kind: ConclusionKind = "review"): Promise<ConclusionResult> {
    const rule = CONCLUDES[kind];
    return this.unit.run(async ({ flow }) => {
      await flow.lockTask(scope.taskId);
      await flow.assertWorkScope?.(scope);
      const plan = await flow.plans.lock(scope.taskId);
      if (!plan) throw new TaskFlowError("action_unavailable");
      const action = plan.actions.find((candidate) => candidate.id === input.actionId);
      if (!action || !rule.owns(action)) throw new TaskFlowError("action_unavailable");
      if (action.concludedAt) return { actionId: action.id, state: action.state, concludedAt: action.concludedAt };
      if (plan.revision !== input.expectedRevision) throw new TaskFlowError("plan_version_changed", { revision: plan.revision });
      await rule.assert(flow, plan, action);
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

/** Accepting a partial direct execution keeps the work the agent reported and releases publication; only a run that ended as partial qualifies. */
async function assertPartialAcceptable(flow: TaskFlowDao, plan: PlanRecord, action: ActionRecord) {
  if (action.state !== BLOCKED_STATE) throw new TaskFlowError(IDLE_STATES.includes(action.state) ? "action_unavailable" : "action_active");
  if (await flow.runs.activeWrite(plan.taskId)) throw new TaskFlowError("action_active");
  const { items } = await flow.runs.list({ taskId: plan.taskId, limit: RUN_LOOKUP_LIMIT });
  const latest = items.find((run) => run.actionId === action.id);
  if (latest?.terminalCode !== DIRECT_PARTIAL_REASON) throw new TaskFlowError("action_unavailable");
}
