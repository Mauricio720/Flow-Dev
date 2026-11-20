import type { CompozyAgentRuntime, CompozyGateway } from "../application/compozy/compozyGateway";
import { parseExecutionRuntime } from "../application/compozy/compozyExecutionRuntime";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { ExecutionCancelService } from "../application/services/execution/executionCancelService";
import { ExecutionDispatcher } from "../application/services/execution/executionDispatcher";
import { ExecutionFactsReader } from "../application/services/execution/executionFactsReader";
import { ExecutionStartService } from "../application/services/execution/executionStartService";
import { ExecutionSpecFilesService } from "../application/services/execution/executionSpecFilesService";
import { ExecutionSpecReviewService } from "../application/services/execution/executionSpecReviewService";
import { EXECUTION_SYNC_INTERVAL_MS, ExecutionStatusService } from "../application/services/execution/executionStatusService";
import { ExecutionSyncService, type SyncOutcome } from "../application/services/execution/executionSyncService";
import type { ExecutionRecord } from "../application/database/dao/taskExecutionDao";
import { TaskExecutionController } from "../controllers/taskExecutionController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { compozyGateway } from "./compozyComposition";
import { requireDatabase, type Database } from "./database/client";
import { DrizzleIssueClaimDao } from "./database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleIssueSourceDao } from "./database/dao/assigned-issues/drizzleIssueSourceDao";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleTaskExecutionDao } from "./database/dao/execution/drizzleTaskExecutionDao";
import { DrizzleProjectCompozyBindingDao } from "./database/dao/project-compozy/drizzleProjectCompozyBindingDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { staleWhileRevalidate } from "./staleWhileRevalidate";

export type ExecutionOverrides = { gateway?: CompozyGateway; authorization?: WorkAuthorization; clock?: () => Date; runtime?: () => CompozyAgentRuntime | null; ids?: () => string };

export function createTaskExecutionController(database: Database, overrides: ExecutionOverrides = {}) {
  const gateway = overrides.gateway ?? compozyGateway();
  const clock = overrides.clock ?? (() => new Date());
  const dao = new DrizzleTaskExecutionDao(database);
  const facts = new ExecutionFactsReader({ executions: dao, sources: new DrizzleIssueSourceDao(database), bindings: new DrizzleProjectCompozyBindingDao(database), projects: new DrizzleProjectDao(database) });
  const sync = new ExecutionSyncService({ dao, gateway, clock });
  const runtime = overrides.runtime ?? (() => parseExecutionRuntime(process.env));
  const start = new ExecutionStartService({ dao, facts, dispatcher: new ExecutionDispatcher({ dao, gateway, clock }), runtime, ids: overrides.ids });
  const status = new ExecutionStatusService({ dao, facts, claims: new DrizzleIssueClaimDao(database), reconcile: throttledReconcile(sync, clock), clock });
  const cancel = new ExecutionCancelService({ dao, gateway, sync, clock });
  const specFiles = new ExecutionSpecFilesService({ dao, gateway });
  const reviewSpec = new ExecutionSpecReviewService({ dao, gateway, clock });
  const authorization = overrides.authorization ?? createWorkAuthorization(database);
  return new TaskExecutionController({ start, status, cancel, specFiles, reviewSpec, authorization, permissions: new DrizzleAccessDao(database) });
}

export function createProductionTaskExecutionController() {
  return createTaskExecutionController(requireDatabase());
}

function throttledReconcile(sync: ExecutionSyncService, clock: () => Date) {
  const pending = new Map<string, ExecutionRecord>();
  const cached = staleWhileRevalidate<SyncOutcome>({ freshMs: EXECUTION_SYNC_INTERVAL_MS, maxStaleMs: EXECUTION_SYNC_INTERVAL_MS, now: () => clock().getTime(), keep: (outcome) => outcome.reachable, load: (id) => sync.reconcile(pending.get(id)!) });
  return (execution: ExecutionRecord) => {
    pending.set(execution.id, execution);
    return cached(execution.id).finally(() => pending.delete(execution.id));
  };
}
