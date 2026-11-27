import { PlanRunGuards } from "../application/services/plan-run/planRunGuards";
import { PlanRunPauser } from "../application/services/plan-run/planRunPauser";
import { PlanRunStep } from "../application/services/plan-run/planRunStep";
import { PlanRunStepStart } from "../application/services/plan-run/planRunStepStart";
import { ConsolePlanLog } from "../application/services/tasks-set/planLog";
import type { PlanLog } from "../application/services/tasks-set/planLog";
import { DrizzleExecutionPlanDao } from "./database/dao/plans/drizzleExecutionPlanDao";
import { DrizzlePlanRunDao } from "./database/dao/plans/drizzlePlanRunDao";
import { DrizzlePlanRunWorkerDao } from "./database/dao/plans/drizzlePlanRunWorkerDao";
import type { WorkerParts } from "./sessionWorkerParts";

export function buildPlanRunStep(parts: WorkerParts, log: PlanLog = new ConsolePlanLog()) {
  const { database, identity } = parts;
  const runs = new DrizzlePlanRunDao(database);
  const pauser = new PlanRunPauser({ runs, log });
  const guards = new PlanRunGuards({ claims: parts.reviewClaims, planning: parts.sessions, plans: new DrizzleExecutionPlanDao(database), loader: parts.reviewTaskSets, pauser });
  const starter = new PlanRunStepStart({ runs, launcher: parts.reviewLauncher, pauser, log });
  return new PlanRunStep({ worker: new DrizzlePlanRunWorkerDao(database), runs, guards, starter, pauser, captureStop: (sessionId) => parts.recorder.captureStop(sessionId), hostId: identity.hostId, log });
}
