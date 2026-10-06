import { and, desc, eq, inArray, or } from "drizzle-orm";
import { taskDraftRevisions, taskEvidence } from "../../schema";
import type { Database } from "../../client";

type RetainedEvidenceScope = { taskId: string; baseRevisionId?: string | null };
type BindableEvidenceScope = { taskId: string; operationId: string; priorBindings: unknown };

const retainedEvidenceColumns = {
  id: taskEvidence.id,
  type: taskEvidence.type,
  path: taskEvidence.path,
  commitSha: taskEvidence.commitSha,
  fromLine: taskEvidence.fromLine,
  toLine: taskEvidence.toLine,
  issueId: taskEvidence.issueId,
  issueNumber: taskEvidence.issueNumber,
  url: taskEvidence.url,
};

export async function loadRetainedEvidence(database: Database, scope: RetainedEvidenceScope) {
  if (!scope.baseRevisionId) return [];
  const [revision] = await database.select({ evidenceBindings: taskDraftRevisions.evidenceBindings }).from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, scope.taskId), eq(taskDraftRevisions.id, scope.baseRevisionId))).limit(1);
  const evidenceIds = boundEvidenceIds(revision?.evidenceBindings);
  if (!evidenceIds.length) return [];
  return database.select(retainedEvidenceColumns).from(taskEvidence).where(and(eq(taskEvidence.taskId, scope.taskId), inArray(taskEvidence.id, evidenceIds)));
}

export async function loadBindableEvidence(database: Database, scope: BindableEvidenceScope) {
  const retainedIds = boundEvidenceIds(scope.priorBindings);
  const retrievedNow = eq(taskEvidence.operationId, scope.operationId);
  const bindable = retainedIds.length ? or(retrievedNow, inArray(taskEvidence.id, retainedIds)) : retrievedNow;
  return database.select().from(taskEvidence).where(and(eq(taskEvidence.taskId, scope.taskId), bindable)).orderBy(desc(taskEvidence.retrievedAt));
}

function boundEvidenceIds(bindings: unknown) {
  if (!Array.isArray(bindings)) return [];
  const ids = bindings.map((binding: unknown) => (binding && typeof binding === "object" ? (binding as { evidenceId?: unknown }).evidenceId : undefined));
  return [...new Set(ids.filter((id): id is string => typeof id === "string"))];
}
