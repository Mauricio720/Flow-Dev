import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { PlanRunService } from "../application/services/plan-run/planRunService";
import { requirePlanOperator } from "../application/services/tasks-set/planAuthorization";
import type { SessionPrincipal } from "../context";

export type PlanRunScope = { projectId: string; taskId: string };
export type PlanRunStartRequest = PlanRunScope & { requestKey: string };
export type PlanRunChangeRequest = PlanRunScope & { revision: number };
export type PlanRunControllerDeps = { service: Pick<PlanRunService, "start" | "pause" | "resume">; authorization: Pick<WorkAuthorization, "requireOperate"> };

export class PlanRunController {
  constructor(private readonly deps: PlanRunControllerDeps) {}

  async start(actor: SessionPrincipal, input: PlanRunStartRequest) {
    await this.requireOperator(actor, input);
    return this.deps.service.start({ ...input, actorId: actor.userId });
  }

  async pause(actor: SessionPrincipal, input: PlanRunChangeRequest) {
    await this.requireOperator(actor, input);
    return this.deps.service.pause({ taskId: input.taskId, actorId: actor.userId, revision: input.revision });
  }

  async resume(actor: SessionPrincipal, input: PlanRunChangeRequest) {
    await this.requireOperator(actor, input);
    return this.deps.service.resume({ taskId: input.taskId, actorId: actor.userId, revision: input.revision });
  }

  private requireOperator(actor: SessionPrincipal, input: PlanRunScope) {
    return requirePlanOperator(this.deps.authorization, { projectId: input.projectId, taskId: input.taskId, actorId: actor.userId });
  }
}
