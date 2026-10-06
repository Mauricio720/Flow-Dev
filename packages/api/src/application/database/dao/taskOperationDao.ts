import type { GenerationEnvelope, GenerationInput } from "../../issue-author/issueAuthorGateway";

export type WorkerClaim = { taskId: string; operationId: string; executionId: string; fence: number; workerId: string; sessionId: string; contextCapability: string };
export type WorkerOperationDao = {
  claim(workerId: string): Promise<WorkerClaim | null>;
  heartbeat(claim: WorkerClaim): Promise<void>;
  generationInput(claim: WorkerClaim): Promise<GenerationInput>;
  completeGeneration(claim: WorkerClaim, result: GenerationEnvelope): Promise<void>;
  failGeneration(claim: WorkerClaim, reason: string): Promise<void>;
};
