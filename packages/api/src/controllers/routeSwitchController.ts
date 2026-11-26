import type { RouteSwitchDao } from "../application/database/dao/routeSwitchDao";
import type { RouteSwitchDecision } from "../application/terminal/routeSwitch";
import type { SessionControlAuthorization } from "../application/services/terminal/sessionControlAuthorization";
import type { RouteSwitchService } from "../application/services/terminal/routeSwitchService";
import type { SessionLog } from "../application/services/terminal/sessionLog";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionPrincipal } from "../context";

export type DecideRouteSwitchInput = { projectId: string; taskId: string; sessionId: string; proposalId: string; decision: RouteSwitchDecision; requestKey: string };
export type RouteSwitchControllerDeps = { control: SessionControlAuthorization; routeSwitches: Pick<RouteSwitchDao, "findById">; service: Pick<RouteSwitchService, "decide">; log: SessionLog };

export class RouteSwitchController {
  constructor(private readonly deps: RouteSwitchControllerDeps) {}

  async decide(actor: SessionPrincipal, input: DecideRouteSwitchInput) {
    const session = await this.deps.control.requireOwnActive({ projectId: input.projectId, taskId: input.taskId, sessionId: input.sessionId, actorId: actor.userId });
    const record = await this.deps.routeSwitches.findById(input.proposalId);
    if (!record || record.sessionId !== input.sessionId || record.taskId !== input.taskId || session.projectId !== input.projectId || session.taskId !== record.taskId) throw new TaskError("route_switch_not_found");
    const { proposal, outcome } = await this.deps.service.decide({ record, decision: input.decision, actorId: actor.userId, requestKey: input.requestKey });
    if (outcome === "decided") this.deps.log.info("route_switch_decided", { proposalId: record.id, decision: input.decision, actorId: actor.userId });
    return { proposal };
  }
}
