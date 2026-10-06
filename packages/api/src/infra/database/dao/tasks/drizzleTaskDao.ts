import type { TaskDao } from "../../../../application/database/dao/taskDao";
import { DrizzleTaskCommandDao } from "./drizzleTaskCommandDao";
import { DrizzleTaskReadDao } from "./drizzleTaskReadDao";
import { DrizzleTaskDraftDao } from "./drizzleTaskDraftDao";
import { DrizzleTaskWorkspaceDao } from "./drizzleTaskWorkspaceDao";
import type { Database } from "../../client";
import { readPlanningProjection } from "./planningProjection";

export class DrizzleTaskDao implements TaskDao {
  private readonly commands: DrizzleTaskCommandDao;
  private readonly reads: DrizzleTaskReadDao;
  private readonly drafts: DrizzleTaskDraftDao;
  private readonly workspace: DrizzleTaskWorkspaceDao;
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
    this.commands = new DrizzleTaskCommandDao(database);
    this.reads = new DrizzleTaskReadDao(database);
    this.drafts = new DrizzleTaskDraftDao(database);
    this.workspace = new DrizzleTaskWorkspaceDao(database);
  }

  list(input: Parameters<TaskDao["list"]>[0]) { return this.reads.list(input); }
  findScoped(projectId: string, taskId: string) { return this.reads.findScoped(projectId, taskId); }
  findRevision(taskId: string, revisionId: string) { return this.reads.findRevision(taskId, revisionId); }
  currentRevision(taskId: string) { return this.reads.currentRevision(taskId); }
  evidence(taskId: string) { return this.reads.evidence(taskId); }
  pendingProposal(taskId: string) { return this.reads.pendingProposal(taskId); }
  publication(taskId: string) { return this.reads.publication(taskId); }
  activity(taskId: string) { return this.workspace.activity(taskId); }
  authorNames(userIds: string[]) { return this.workspace.authorNames(userIds); }
  messages(taskId: string, cursor: string | undefined, limit: number) { return this.reads.messages(taskId, cursor, limit); }
  revisions(taskId: string, cursor: string | undefined, limit: number) { return this.reads.revisions(taskId, cursor, limit); }
  planning(taskId: string) { return readPlanningProjection(this.database, taskId); }
  snapshot<T>(read: (dao: TaskDao) => Promise<T>): Promise<T> { return this.database.transaction((tx) => read(new DrizzleTaskDao(tx as unknown as Database)), { isolationLevel: "repeatable read", accessMode: "read only" }); }
  start(input: Parameters<TaskDao["start"]>[0]) { return this.commands.start(input); }
  send(input: Parameters<TaskDao["send"]>[0], kind: "clarification" | "refinement") { return this.commands.send(input, kind); }
  retryGeneration(input: Parameters<TaskDao["retryGeneration"]>[0]) { return this.commands.retryGeneration(input); }
  submission(input: Parameters<TaskDao["submission"]>[0]) { return this.commands.submission(input); }
  resolveRefinement(input: Parameters<TaskDao["resolveRefinement"]>[0]) { return this.drafts.resolveRefinement(input); }
  saveDraft(input: Parameters<TaskDao["saveDraft"]>[0]) { return this.drafts.saveDraft(input); }
}
