import type { PlanningEnvelope } from "../../planning/planningGateway";
import type { PlanningDispatch } from "../../services/tasks/planningContracts";

export type PlanningClaim = { taskId: string; projectId: string; authorUserId: string; sessionId: string; operationId: string; executionId: string; fence: number; workerId: string; leaseUntil: Date; attempts: number; deadline: Date; repositoryId: string; repositoryNodeId: string; contextCapability: string };
export type PlanningSettlement = { claim: PlanningClaim; envelope: PlanningEnvelope };
export type PlanningFailure = { claim: PlanningClaim; reason: string };
export type PlanningRequeue = PlanningFailure & { nextRunAt: Date };

export interface TaskPlanningWorkerDao {
  claim(workerId: string): Promise<PlanningClaim | null>;
  heartbeat(claim: PlanningClaim): Promise<void>;
  sessionActive(claim: PlanningClaim): Promise<boolean>;
  input(claim: PlanningClaim): Promise<PlanningDispatch>;
  complete(input: PlanningSettlement): Promise<void>;
  fail(input: PlanningFailure): Promise<void>;
  requeue(input: PlanningRequeue): Promise<void>;
}
