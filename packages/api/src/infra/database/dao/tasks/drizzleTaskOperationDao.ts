import { DrizzleTaskOperationDao } from "./taskOperationDaoImpl";
import type { WorkerOperationDao } from "../../../../application/database/dao/taskOperationDao";
import type { Database } from "../../client";

export class DrizzleWorkerOperationDao implements WorkerOperationDao {
  private readonly implementation: DrizzleTaskOperationDao;
  constructor(database: Database) { this.implementation = new DrizzleTaskOperationDao(database); }
  claim(workerId: string) { return this.implementation.claim(workerId); }
  heartbeat(claim: Parameters<WorkerOperationDao["heartbeat"]>[0]) { return this.implementation.heartbeat(claim); }
  generationInput(claim: Parameters<WorkerOperationDao["generationInput"]>[0]) { return this.implementation.generationInput(claim); }
  completeGeneration(claim: Parameters<WorkerOperationDao["completeGeneration"]>[0], result: Parameters<WorkerOperationDao["completeGeneration"]>[1]) { return this.implementation.completeGeneration(claim, result); }
  failGeneration(claim: Parameters<WorkerOperationDao["failGeneration"]>[0], reason: string) { return this.implementation.failGeneration(claim, reason); }
  hasActivity(executionId: string, toolCallId: string) { return this.implementation.hasActivity(executionId, toolCallId); }
}
