import type { TaskPublicationDao } from "../../../../application/database/dao/taskPublicationDao";
import type { Database } from "../../client";
import { approveTaskPublication, findAcceptedTaskPublication } from "./taskPublicationApproval";
import { fenceTaskPublication, settleTaskPublication } from "./taskPublicationState";
import { reconcileTaskPublication } from "./taskPublicationRecovery";

export class DrizzleTaskPublicationDao implements TaskPublicationDao {
  constructor(private readonly database: Database) {}
  accepted(input: Parameters<TaskPublicationDao["accepted"]>[0]) { return findAcceptedTaskPublication(this.database, input); }
  approve(input: Parameters<TaskPublicationDao["approve"]>[0]) { return approveTaskPublication(this.database, input); }
  fenceDispatch(taskId: string, attemptId: string) { return fenceTaskPublication(this.database, taskId, attemptId); }
  settle(taskId: string, attemptId: string, outcome: Parameters<TaskPublicationDao["settle"]>[2]) { return settleTaskPublication(this.database, taskId, attemptId, outcome); }
  reconciliation(taskId: string, attemptId: string, projectId: string, actorUserId: string, expectedVersion: number, requestKey: string) { return reconcileTaskPublication(this.database, { taskId, attemptId, projectId, actorUserId, expectedVersion, requestKey }); }
}
