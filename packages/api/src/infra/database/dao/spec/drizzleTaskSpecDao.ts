import { and, eq } from "drizzle-orm";
import type { SpecActorScope, TaskSpecDao } from "../../../../application/database/dao/taskSpecDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecCommands, tasks } from "../../schema";
import type { Database } from "../../client";
import { toReceipt } from "./specCommandHelpers";
import { acceptSpecCommand } from "./specAccept";
import { acceptAdjust } from "./specAdjust";
import { acceptCancel } from "./specCancel";
import { acceptRetry } from "./specRetry";
import { acceptReturnToReview } from "./specReturn";
import { resolveInteractionCommand } from "./specInteractionResolve";
import { failQueuedAttempt, readDispatchAttempt } from "./specAttemptSettlement";
import { readSpecPackage, readSpecPackages, readSpecDocument } from "./specPackageReads";
import { readSpecEvent, readSpecEvents } from "./specReads";
import { readSpecSnapshot } from "./specSnapshot";
import { acceptSpecStart } from "./specStart";

const ACTIVE_ATTEMPT_CONSTRAINT = "task_spec_attempts_active_workflow_idx";
const REQUEST_KEY_CONSTRAINT = "task_spec_commands_request_unique";
const UNIQUE_VIOLATION = "23505";

export class DrizzleTaskSpecDao implements TaskSpecDao {
  constructor(private readonly database: Database) {}

  async hadAccess(scope: SpecActorScope) {
    const [authored] = await this.database.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.projectId, scope.projectId), eq(tasks.id, scope.taskId), eq(tasks.authorUserId, scope.actorUserId))).limit(1);
    if (authored) return true;
    const [command] = await this.database.select({ id: taskSpecCommands.id }).from(taskSpecCommands).where(and(eq(taskSpecCommands.projectId, scope.projectId), eq(taskSpecCommands.taskId, scope.taskId), eq(taskSpecCommands.actorUserId, scope.actorUserId))).limit(1);
    return Boolean(command);
  }

  findDispatchAttempt(attemptId: string) { return readDispatchAttempt(this.database, attemptId); }
  failQueuedAttempt(input: Parameters<TaskSpecDao["failQueuedAttempt"]>[0]) { return failQueuedAttempt(this.database, input); }
  resolveInteraction(input: Parameters<TaskSpecDao["resolveInteraction"]>[0]) { return this.guard(() => resolveInteractionCommand(this.database, input)); }
  snapshot(scope: Parameters<TaskSpecDao["snapshot"]>[0]) { return readSpecSnapshot(this.database, scope); }
  events(input: Parameters<TaskSpecDao["events"]>[0]) { return readSpecEvents(this.database, input); }
  event(scope: Parameters<TaskSpecDao["event"]>[0]) { return readSpecEvent(this.database, scope); }
  packages(input: Parameters<TaskSpecDao["packages"]>[0]) { return readSpecPackages(this.database, input); }
  package(scope: Parameters<TaskSpecDao["package"]>[0]) { return readSpecPackage(this.database, scope); }
  document(input: Parameters<TaskSpecDao["document"]>[0]) { return readSpecDocument(this.database, input); }
  start(input: Parameters<TaskSpecDao["start"]>[0]) { return this.guard(() => acceptSpecStart(this.database, input)); }
  accept(input: Parameters<TaskSpecDao["accept"]>[0]) {
    const action = { ...input, attemptId: input.attemptId, stage: input.stage };
    if (input.action === "spec.adjust") return this.guard(() => acceptAdjust(this.database, action as never));
    if (input.action === "spec.cancel") return this.guard(() => acceptCancel(this.database, action as never));
    if (input.action === "spec.retry") return this.guard(() => acceptRetry(this.database, action as never));
    if (input.action === "spec.returnToReview") return this.guard(() => acceptReturnToReview(this.database, action as never));
    return this.guard(() => acceptSpecCommand(this.database, input));
  }

  async submission(target: Parameters<TaskSpecDao["submission"]>[0]) {
    const row = (await this.database.select().from(taskSpecCommands).where(and(eq(taskSpecCommands.actorUserId, target.actorUserId), eq(taskSpecCommands.requestKey, target.requestKey))).limit(1))[0];
    if (!row) return null;
    if (row.action !== target.action || row.taskId !== target.taskId || row.projectId !== target.projectId) throw new TaskError("spec_unavailable");
    return toReceipt(row);
  }

  private async guard<T>(command: () => Promise<T>) {
    try { return await command(); }
    catch (error) {
      const cause = (error as { cause?: { code?: string; constraint_name?: string } }).cause;
      if (cause?.code !== UNIQUE_VIOLATION) throw error;
      if (cause.constraint_name === ACTIVE_ATTEMPT_CONSTRAINT) throw new TaskError("attempt_active");
      if (cause.constraint_name === REQUEST_KEY_CONSTRAINT) throw new TaskError("request_key_reused");
      throw error;
    }
  }
}
