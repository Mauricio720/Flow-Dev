import type { WorkerClaim, WorkerOperationDao } from "../../../../application/database/dao/taskOperationDao";
import type { Database } from "../../client";
import { and, eq } from "drizzle-orm";
import { taskToolActivity } from "../../schema";
import { claimTaskOperation } from "./taskOperationClaim";
import { loadGenerationInput } from "./taskOperationInput";
import { completeTaskGeneration, failTaskGeneration, heartbeatTaskOperation } from "./taskOperationSettlement";

export class DrizzleTaskOperationDao implements WorkerOperationDao {
  constructor(private readonly database: Database) {}
  claim(workerId: string) { return claimTaskOperation(this.database, workerId); }
  heartbeat(claim: WorkerClaim) { return heartbeatTaskOperation(this.database, claim); }
  generationInput(claim: WorkerClaim) { return loadGenerationInput(this.database, claim); }
  completeGeneration(claim: WorkerClaim, result: Parameters<WorkerOperationDao["completeGeneration"]>[1]) { return completeTaskGeneration(this.database, claim, result); }
  failGeneration(claim: WorkerClaim, reason: string) { return failTaskGeneration(this.database, claim, reason); }
  async hasActivity(executionId: string, toolCallId: string) { return (await this.database.select({ id: taskToolActivity.id }).from(taskToolActivity).where(and(eq(taskToolActivity.executionId, executionId), eq(taskToolActivity.toolCallId, toolCallId))).limit(1)).length > 0; }
}
