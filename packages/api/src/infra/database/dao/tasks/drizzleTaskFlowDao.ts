import { and, eq, sql } from "drizzle-orm";
import type { FlowKind, TaskFlowDao } from "../../../../application/database/dao/taskFlowDao";
import type { Database } from "../../client";
import { taskIssueClaims, taskIssueSnapshots, taskIssueSources, tasks } from "../../schema";
import { assertCurrentWorkScope } from "../../../../application/services/task-flow/taskFlowWorkScope";
import type { TaskScope } from "../../../../application/services/task-flow/taskFlowPorts";
import { TaskFlowPlanStore } from "./taskFlowPlanStore";
import { TaskFlowPackageStore } from "./taskFlowPackageStore";
import { TaskFlowRunStore } from "./taskFlowRunStore";

export class DrizzleTaskFlowDao implements TaskFlowDao {
  readonly plans;
  readonly runs;
  readonly packages;

  constructor(private readonly database: Database) {
    this.plans = new TaskFlowPlanStore(database);
    this.runs = new TaskFlowRunStore(database);
    this.packages = new TaskFlowPackageStore(database);
  }

  async flowKind(taskId: string): Promise<FlowKind> {
    const rows = await this.database.execute<{ flow_kind: FlowKind }>(sql`SELECT flow_kind FROM task_flow_kinds WHERE task_id = ${taskId}`);
    return rows[0]?.flow_kind ?? "none";
  }

  async lockTask(taskId: string) {
    await this.database.execute(sql`SELECT id FROM tasks WHERE id = ${taskId} FOR UPDATE`);
  }

  async assertWorkScope(scope: TaskScope) {
    await this.database.select({ taskId: taskIssueClaims.taskId }).from(taskIssueClaims).where(eq(taskIssueClaims.taskId, scope.taskId)).for("update");
    const [work] = await this.database.select({ operatorUserId: taskIssueClaims.operatorUserId, claimState: taskIssueClaims.state, claimRevision: taskIssueClaims.revision, sourceSnapshotId: taskIssueSources.currentSnapshotId }).from(tasks).innerJoin(taskIssueSources, eq(taskIssueSources.taskId, tasks.id)).leftJoin(taskIssueClaims, eq(taskIssueClaims.taskId, tasks.id)).where(and(eq(tasks.id, scope.taskId), eq(tasks.projectId, scope.projectId))).for("update", { of: [tasks] });
    assertCurrentWorkScope(scope, work);
  }

  async taskContext(taskId: string) {
    const [row] = await this.database.select({ projectId: tasks.projectId, operatorUserId: taskIssueClaims.operatorUserId, issueNumber: taskIssueSources.issueNumber, snapshotId: taskIssueSources.currentSnapshotId, title: taskIssueSnapshots.title, bodyMarkdown: taskIssueSnapshots.bodyMarkdown }).from(tasks).leftJoin(taskIssueClaims, eq(taskIssueClaims.taskId, tasks.id)).leftJoin(taskIssueSources, eq(taskIssueSources.taskId, tasks.id)).leftJoin(taskIssueSnapshots, and(eq(taskIssueSnapshots.id, taskIssueSources.currentSnapshotId!), eq(taskIssueSnapshots.taskId, tasks.id))).where(eq(tasks.id, taskId));
    return row ? {
      projectId: row.projectId,
      operatorUserId: row.operatorUserId ?? null,
      source: row.snapshotId && row.issueNumber !== null && row.title !== null && row.bodyMarkdown !== null ? { issueNumber: row.issueNumber, title: row.title, bodyMarkdown: row.bodyMarkdown } : null,
    } : null;
  }

  transaction<T>(callback: (dao: TaskFlowDao) => Promise<T>): Promise<T> {
    return this.database.transaction((tx): Promise<T> => callback(new DrizzleTaskFlowDao(tx as unknown as Database)));
  }
}
