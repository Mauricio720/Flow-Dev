import type { PlanningClaim, PlanningFailure, PlanningRequeue, PlanningSettlement, TaskPlanningWorkerDao } from "../../../../application/database/dao/taskPlanningWorkerDao";
import type { Database } from "../../client";
import { claimPlanning } from "./planningWorkerClaim";
import { heartbeatPlanning, planningSessionActive, readPlanningInput } from "./planningWorkerInput";
import { completePlanning, failPlanning, requeuePlanning } from "./planningWorkerSettlement";

export class DrizzleTaskPlanningWorkerDao implements TaskPlanningWorkerDao {
  constructor(private readonly database: Database, private readonly clock = () => new Date()) {}
  claim(workerId: string) { return claimPlanning(this.database, workerId, this.clock()); }
  heartbeat(claim: PlanningClaim) { return heartbeatPlanning(this.database, claim, this.clock()); }
  sessionActive(claim: PlanningClaim) { return planningSessionActive(this.database, claim, this.clock()); }
  input(claim: PlanningClaim) { return readPlanningInput(this.database, claim); }
  complete(input: PlanningSettlement) { return completePlanning(this.database, input, this.clock()); }
  fail(input: PlanningFailure) { return failPlanning(this.database, input, this.clock()); }
  requeue(input: PlanningRequeue) { return requeuePlanning(this.database, input, this.clock()); }
}
