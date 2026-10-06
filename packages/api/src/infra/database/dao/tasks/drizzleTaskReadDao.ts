import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { decodeTaskCursor, encodeTaskCursor } from "../../../../application/pagination/taskCursor";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskDraftRevisions, taskEvidence, taskMessages, taskOperations, taskPublicationAttempts, tasks, users } from "../../schema";
import type { Database } from "../../client";
import { toTaskMessage, toTaskRecord, toTaskRevision } from "./taskDaoMapping";
import type { TaskEvidenceRecord } from "../../../../application/database/dao/taskDao";
import { planningListStatus } from "../../../../application/services/tasks/planningRules";
import { parseIssueDraft, storedDraftLabels } from "../../../../application/services/tasks/draftRules";

export class DrizzleTaskReadDao {
  constructor(private readonly database: Database) {}

  async list(input: { projectId: string; search?: string; cursor?: string; limit: number }) {
    const cursor = decodeTaskCursor(input.cursor, "tasks", input.projectId);
    const filters = [eq(tasks.projectId, input.projectId)];
    if (input.search) filters.push(or(ilike(tasks.title, searchPattern(input.search)), inArray(tasks.authorUserId, this.authorsMatching(input.search)))!);
    if (cursor) filters.push(sql`(${tasks.createdAt} < ${cursor.position}::timestamptz or (${tasks.createdAt} = ${cursor.position}::timestamptz and ${tasks.id} < ${cursor.id ?? ""}::uuid))`);
    const rows = await this.database.select({ task: tasks, canonicalDraft: taskDraftRevisions.canonicalDraft, cursorCreatedAt: sql<string>`to_char(${tasks.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` }).from(tasks).leftJoin(taskDraftRevisions, eq(taskDraftRevisions.id, tasks.currentRevisionId)).where(and(...filters)).orderBy(desc(tasks.createdAt), desc(tasks.id)).limit(input.limit + 1);
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit).map((row) => summary(toTaskRecord(row.task), row.canonicalDraft));
    const last = items.at(-1);
    const lastCursor = rows[input.limit - 1];
    return { items, nextCursor: hasMore && last && lastCursor ? encodeTaskCursor({ kind: "tasks", scope: input.projectId, position: lastCursor.cursorCreatedAt, id: last.id }) : null };
  }

  private authorsMatching(search: string) {
    return this.database.select({ id: users.id }).from(users).where(or(ilike(users.name, searchPattern(search)), ilike(users.displayName, searchPattern(search))));
  }

  async findScoped(projectId: string, taskId: string) {
    const row = (await this.database.select().from(tasks).where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId))).limit(1))[0];
    return row ? toTaskRecord(row) : null;
  }

  async findRevision(taskId: string, revisionId: string) {
    const row = (await this.database.select().from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, taskId), eq(taskDraftRevisions.id, revisionId))).limit(1))[0];
    return row ? toTaskRevision(row) : null;
  }

  async currentRevision(taskId: string) {
    const task = (await this.database.select({ revisionId: tasks.currentRevisionId }).from(tasks).where(eq(tasks.id, taskId)).limit(1))[0];
    if (!task?.revisionId) return null;
    return this.findRevision(taskId, task.revisionId);
  }

  async evidence(taskId: string): Promise<TaskEvidenceRecord[]> {
    const rows = await this.database.select({ id: taskEvidence.id, repositoryId: taskEvidence.repositoryId, operationId: taskEvidence.operationId, type: taskEvidence.type, path: taskEvidence.path, commitSha: taskEvidence.commitSha, fromLine: taskEvidence.fromLine, toLine: taskEvidence.toLine, issueId: taskEvidence.issueId, issueNumber: taskEvidence.issueNumber, url: taskEvidence.url }).from(taskEvidence).where(eq(taskEvidence.taskId, taskId)).orderBy(desc(taskEvidence.retrievedAt)).limit(500);
    return rows.map((row) => ({ ...row, type: row.type as TaskEvidenceRecord["type"] }));
  }

  async pendingProposal(taskId: string) {
    const task = (await this.database.select({ operationId: tasks.pendingProposalOperationId }).from(tasks).where(eq(tasks.id, taskId)).limit(1))[0];
    if (!task?.operationId) return null;
    const operation = (await this.database.select().from(taskOperations).where(and(eq(taskOperations.taskId, taskId), eq(taskOperations.id, task.operationId))).limit(1))[0];
    try {
      const result = operation?.result as { result?: { status?: string; draft?: unknown } } | null;
      if (!operation || result?.result?.status !== "draft_ready") throw new Error("invalid");
      return { operationId: operation.id, draft: parseIssueDraft(result.result.draft), baseRevisionId: operation.baseRevisionId };
    } catch { throw new TaskError("invalid_stored_content"); }
  }

  async publication(taskId: string) {
    const row = (await this.database.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.outcome, "created"))).limit(1))[0];
    if (!row?.issueId || !row.issueNumber || !row.issueUrl || !row.issueCreatedAt) return null;
    return { issueId: row.issueId, issueNumber: row.issueNumber, issueUrl: row.issueUrl, createdAt: row.issueCreatedAt, title: row.titleSnapshot, bodyMarkdown: row.bodySnapshot, repository: `${row.approvedOwner}/${row.approvedName}` };
  }

  async messages(taskId: string, value: string | undefined, limit: number) {
    const cursor = decodeTaskCursor(value, "messages", taskId);
    const sequence = cursor ? Number(cursor.position) : null;
    const rows = await this.database.select().from(taskMessages).where(sequence ? and(eq(taskMessages.taskId, taskId), gt(taskMessages.sequence, sequence)) : eq(taskMessages.taskId, taskId)).orderBy(asc(taskMessages.sequence)).limit(limit + 1);
    return page(rows.map((row) => toTaskMessage(row)), rows.length > limit, limit, (item) => encodeTaskCursor({ kind: "messages", scope: taskId, position: String(item.sequence) }));
  }

  async revisions(taskId: string, value: string | undefined, limit: number) {
    const cursor = decodeTaskCursor(value, "revisions", taskId);
    const revisionNumber = cursor ? Number(cursor.position) : null;
    const rows = await this.database.select().from(taskDraftRevisions).where(revisionNumber ? and(eq(taskDraftRevisions.taskId, taskId), gt(taskDraftRevisions.revisionNumber, revisionNumber)) : eq(taskDraftRevisions.taskId, taskId)).orderBy(asc(taskDraftRevisions.revisionNumber)).limit(limit + 1);
    return page(rows.map((row) => toTaskRevision(row)), rows.length > limit, limit, (item) => encodeTaskCursor({ kind: "revisions", scope: taskId, position: String(item.revisionNumber) }));
  }
}

function searchPattern(value: string) { return `%${value.replace(/[\\%_]/g, "\\$&")}%`; }
function summary(task: ReturnType<typeof toTaskRecord>, canonicalDraft: unknown) { return { id: task.id, projectId: task.projectId, authorUserId: task.authorUserId, status: task.status as "generating", planningStatus: planningListStatus(task.status, task.planningStatus), version: task.version, title: task.title, labels: canonicalDraft ? storedDraftLabels(canonicalDraft) : [], createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() }; }
function page<T>(items: T[], hasMore: boolean, limit: number, cursor: (item: T) => string) { const visible = items.slice(0, limit); return { items: visible, nextCursor: hasMore && visible.length ? cursor(visible.at(-1)!) : null }; }
