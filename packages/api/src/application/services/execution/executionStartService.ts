import { randomUUID } from "node:crypto";
import type { CompozyAgentRuntime } from "../../compozy/compozyGateway";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";
import type { ExecutionDispatcher } from "./executionDispatcher";
import type { ExecutionFacts, ExecutionFactsReader } from "./executionFactsReader";
import { logExecutionEvent } from "./executionLog";
import { buildExecutionPlan } from "./executionPlan";
import { assertExecutionStartable } from "./executionStartRules";

export type StartExecutionInput = { projectId: string; taskId: string; decisionId: string; expectedDecisionVersion: number; idempotencyKey: string; actorId: string; claimed: boolean };
type StartDeps = { dao: TaskExecutionDao; facts: ExecutionFactsReader; dispatcher: ExecutionDispatcher; runtime: () => CompozyAgentRuntime | null; ids?: () => string };
const RETRYABLE_STATE = "unavailable";

export class ExecutionStartService {
  constructor(private readonly deps: StartDeps) {}

  async start(input: StartExecutionInput) {
    const existing = await this.deps.dao.findByRequest(input.taskId, input.idempotencyKey);
    if (existing && existing.state !== RETRYABLE_STATE) return startResult(existing, true);
    const facts = await this.deps.facts.read({ projectId: input.projectId, taskId: input.taskId, claimed: input.claimed });
    assertExecutionStartable(facts, input);
    const execution = existing ? await this.reopen(existing) : await this.insert(input, facts);
    if (!execution) return startResult((await this.deps.dao.findByRequest(input.taskId, input.idempotencyKey))!, true);
    logExecutionEvent("execution.start", { taskId: input.taskId, executionId: execution.id, route: execution.route, attempt: execution.attempt });
    return startResult(await this.deps.dispatcher.dispatch(execution, this.plan(execution, facts)), false);
  }

  private async insert(input: StartExecutionInput, facts: ExecutionFacts) {
    const id = (this.deps.ids ?? randomUUID)();
    const plan = this.plan({ id, taskId: input.taskId }, facts);
    const inserted = await this.deps.dao.insertDispatching({ id, taskId: input.taskId, planningDecisionId: facts.decision!.id, route: plan.route, idempotencyKey: input.idempotencyKey, compozyWorkspaceId: facts.binding!.compozyWorkspaceId!, branch: plan.branch, startedBy: input.actorId });
    if (inserted) return inserted;
    if (await this.deps.dao.findByRequest(input.taskId, input.idempotencyKey)) return null;
    throw new TaskError("execution_active");
  }

  private reopen(execution: ExecutionRecord) {
    return this.deps.dao.transition({ id: execution.id, from: [RETRYABLE_STATE], patch: { state: "dispatching", failureCode: null } });
  }

  private plan(execution: Pick<ExecutionRecord, "id" | "taskId">, facts: ExecutionFacts) {
    return buildExecutionPlan({ executionId: execution.id, taskId: execution.taskId, projectKey: facts.projectKey, defaultBranch: facts.binding!.defaultBranch!, issue: facts.issue, decision: facts.decision!, runtime: this.deps.runtime() });
  }
}

function startResult(execution: ExecutionRecord, replayed: boolean) {
  return { executionId: execution.id, state: execution.state, replayed };
}
