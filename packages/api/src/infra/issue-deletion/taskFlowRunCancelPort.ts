import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Database } from "../database/client";
import { tasks } from "../database/schema";
import type { ActionExecutor } from "../../application/services/task-flow/actionExecutor";
import type { TaskScope } from "../../application/services/task-flow/taskFlowPorts";
import type { FlowTransaction, FlowUnitOfWork } from "../../application/database/dao/flowUnitOfWork";
import { DrizzleTaskFlowDao } from "../database/dao/tasks/drizzleTaskFlowDao";
import { DrizzleSoftwareDao } from "../database/dao/software/drizzleSoftwareDao";
import { TaskFlowRunControl } from "../../application/services/task-flow/taskFlowRunControl";
import type { RunCancelPort, RunCancelResult } from "../../application/services/issue-deletion/deletionStop";
import { terminalStopState } from "../../application/services/issue-deletion/deletionStop";

const LEASE_MS = 60_000;

class DeletionScopedTaskFlowDao extends DrizzleTaskFlowDao {
  async assertWorkScope(_scope: TaskScope) {}
}

class DeletionFlowUnitOfWork implements FlowUnitOfWork {
  constructor(private readonly database: Database) {}
  run<T>(callback: (transaction: FlowTransaction) => Promise<T>): Promise<T> {
    return this.database.transaction((tx): Promise<T> => {
      const database = tx as unknown as Database;
      return callback({ flow: new DeletionScopedTaskFlowDao(database), software: new DrizzleSoftwareDao(database) });
    });
  }
}

export class TaskFlowRunCancelPort implements RunCancelPort {
  private readonly clock: () => Date;

  constructor(private readonly database: Database, executor: Pick<Required<ActionExecutor>, "cancel">, clock?: () => Date) {
    this.clock = clock ?? (() => new Date());
    this.cancel = executor.cancel.bind(executor);
  }

  private readonly cancel: NonNullable<ActionExecutor["cancel"]>;

  async cancelActiveRuns(taskId: string): Promise<RunCancelResult[]> {
    const unit = new DeletionFlowUnitOfWork(this.database);
    const control = new TaskFlowRunControl({ unit, executor: { cancel: this.cancel }, owner: `deletion:${randomUUID()}`, clock: this.clock, leaseMs: LEASE_MS });
    const project = (await this.database.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1))[0];
    const runs = await unit.run(({ flow }) => flow.runs.list({ taskId, limit: 200 }));
    const results: RunCancelResult[] = [];
    for (const run of runs.items) {
      if (terminalStopState(run.state)) continue;
      const scope: TaskScope = { projectId: project?.projectId ?? "", taskId, actorId: "deletion-worker", sourceSnapshotId: undefined, claimRevision: undefined };
      const result = await control.cancel(scope, { runId: run.id, idempotencyKey: crypto.randomUUID() });
      results.push({ runId: run.id, state: result.state, terminalCode: result.terminalCode });
    }
    return results;
  }
}
