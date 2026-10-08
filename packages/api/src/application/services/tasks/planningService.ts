import type { TaskPlanningDao } from "../../database/dao/taskPlanningDao";
import type { PlanningRoute } from "./planningContracts";
import { planningPayloadHash } from "./planningRules";

type Scope = { projectId: string; taskId: string; actorUserId: string };
type Command = Scope & { requestKey: string; expectedVersion: number };
type Accepting = Command & { sessionId: string; beforeAccept: () => void };
type Review = Command & { decisionId: string; expectedDecisionVersion: number };

export class PlanningService {
  constructor(private readonly dao: TaskPlanningDao) {}

  start(input: Accepting) {
    return this.dao.start({ ...input, payloadHash: planningPayloadHash(input) });
  }

  retry(input: Accepting & { failedOperationId: string }) {
    return this.dao.retry({ ...input, payloadHash: planningPayloadHash(input) });
  }

  selectRoute(input: Review & { selectedRoute: PlanningRoute }) {
    return this.dao.selectRoute({ ...input, payloadHash: planningPayloadHash(input) });
  }

  approve(input: Review & { reviewedRoute: PlanningRoute }) {
    return this.dao.approve({ ...input, payloadHash: planningPayloadHash(input) });
  }

  async submission(input: Scope & { action: string; requestKey: string }) {
    const receipt = await this.dao.submission(input, input.action);
    return receipt ? { status: "accepted" as const, receipt } : { status: "not_accepted" as const };
  }
}
