import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { PublishedIssue, PublishedIssueDao, PublishedIssueDraft, PublishedIssueDraftDao } from "../../../../application/database/dao/publishedIssueDao";
import type { Database } from "../../client";
import { taskDraftRevisions, taskPublicationAttempts, tasks } from "../../schema";

const CREATED_OUTCOME = "created";

export class DrizzlePublishedIssueDao implements PublishedIssueDao, PublishedIssueDraftDao {
  constructor(private readonly database: Database) {}

  async listByProject(projectId: string): Promise<PublishedIssue[]> {
    const rows = await this.database.select({ taskId: taskPublicationAttempts.taskId, issueNodeId: taskPublicationAttempts.issueNodeId, issueNumber: taskPublicationAttempts.issueNumber, issueUrl: taskPublicationAttempts.issueUrl, title: taskPublicationAttempts.titleSnapshot }).from(taskPublicationAttempts).innerJoin(tasks, eq(tasks.id, taskPublicationAttempts.taskId)).where(and(eq(tasks.projectId, projectId), eq(taskPublicationAttempts.outcome, CREATED_OUTCOME), isNotNull(taskPublicationAttempts.issueNodeId))).orderBy(asc(taskPublicationAttempts.issueNumber));
    return rows.map((row) => ({ taskId: row.taskId, issueNodeId: row.issueNodeId!, issueNumber: row.issueNumber ?? 0, issueUrl: row.issueUrl ?? "", title: row.title }));
  }

  async listDraftsByProject(projectId: string): Promise<PublishedIssueDraft[]> {
    const rows = await this.database.select({ taskId: taskPublicationAttempts.taskId, issueNodeId: taskPublicationAttempts.issueNodeId, issueNumber: taskPublicationAttempts.issueNumber, issueUrl: taskPublicationAttempts.issueUrl, title: taskPublicationAttempts.titleSnapshot, canonicalDraft: taskDraftRevisions.canonicalDraft }).from(taskPublicationAttempts).innerJoin(tasks, eq(tasks.id, taskPublicationAttempts.taskId)).innerJoin(taskDraftRevisions, eq(taskDraftRevisions.id, taskPublicationAttempts.revisionId)).where(and(eq(tasks.projectId, projectId), eq(taskPublicationAttempts.outcome, CREATED_OUTCOME), isNotNull(taskPublicationAttempts.issueNumber))).orderBy(asc(taskPublicationAttempts.issueNumber));
    return rows.map((row) => ({ taskId: row.taskId, issueNodeId: row.issueNodeId ?? "", issueNumber: row.issueNumber ?? 0, issueUrl: row.issueUrl ?? "", title: row.title, canonicalDraft: row.canonicalDraft }));
  }
}
