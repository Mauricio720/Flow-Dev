import type { DecideInput, DecideOutcome, InsertPendingInput, RouteSwitchDao } from "../../../../application/database/dao/routeSwitchDao";
import type { Database } from "../../client";
import { findById, findConfirmedForDecision, insertPending, listByTask, readProposalContext } from "./routeSwitchReads";
import { decideRouteSwitch } from "./routeSwitchDecision";

export class DrizzleRouteSwitchDao implements RouteSwitchDao {
  constructor(private readonly database: Database) {}

  readProposalContext(sessionId: string) {
    return readProposalContext(this.database, sessionId);
  }

  insertPending(input: InsertPendingInput) {
    return insertPending(this.database, input);
  }

  findById(id: string) {
    return findById(this.database, id);
  }

  listByTask(taskId: string) {
    return listByTask(this.database, taskId);
  }

  findConfirmedForDecision(planningDecisionId: string) {
    return findConfirmedForDecision(this.database, planningDecisionId);
  }

  decide(input: DecideInput): Promise<DecideOutcome> {
    return decideRouteSwitch(this.database, input);
  }
}
