import type { PlanningAssessment, PlanningDispatch } from "../services/tasks/planningContracts";

export type PlanningEnvelope = { protocolVersion: 1; operationId: string; executionId: string; taskId: string; inputHash: string; result: PlanningAssessment };

export interface PlanningGateway {
  analyze(input: PlanningDispatch, signal: AbortSignal): Promise<PlanningEnvelope>;
}
