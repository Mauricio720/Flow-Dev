import { and, asc, eq } from "drizzle-orm";
import { buildGenerationInput } from "../../../../application/services/tasks/inputRules";
import { parseIssueDraft } from "../../../../application/services/tasks/draftRules";
import { taskDraftRevisions, taskMessages } from "../../schema";
import type { Database } from "../../client";
import { loadRetainedEvidence } from "./retainedEvidence";

export async function assertGenerationCapacity(database: Database, input: { taskId?: string; baseRevisionId?: string | null; message: string }) {
  if (!input.taskId) return buildGenerationInput({ messages: [{ role: "user", content: input.message }], currentDraft: null, retainedEvidence: [] });
  const [messages, revision, evidence] = await Promise.all([
    database.select({ role: taskMessages.role, content: taskMessages.content }).from(taskMessages).where(eq(taskMessages.taskId, input.taskId)).orderBy(asc(taskMessages.sequence)),
    input.baseRevisionId ? database.select({ canonicalDraft: taskDraftRevisions.canonicalDraft }).from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, input.taskId), eq(taskDraftRevisions.id, input.baseRevisionId))).limit(1) : Promise.resolve([]),
    loadRetainedEvidence(database, { taskId: input.taskId, baseRevisionId: input.baseRevisionId }),
  ]);
  const currentDraft = revision[0] ? parseIssueDraft(revision[0].canonicalDraft) : null;
  return buildGenerationInput({ messages: [...messages, { role: "user", content: input.message }], currentDraft, retainedEvidence: evidence });
}
