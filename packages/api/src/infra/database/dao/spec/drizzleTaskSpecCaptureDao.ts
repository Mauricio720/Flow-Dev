import { and, eq, sql } from "drizzle-orm";
import type { SavedSpecPackage, SpecFinalizationDraft, SpecPackageDraft, TaskSpecCaptureDao } from "../../../../application/database/dao/taskSpecCaptureDao";
import { taskSpecDocuments, taskSpecFinalizations, taskSpecPackages } from "../../schema";
import type { Database } from "../../client";

export class DrizzleTaskSpecCaptureDao implements TaskSpecCaptureDao {
  constructor(private readonly database: Database) {}

  savePackage(draft: SpecPackageDraft, finalization?: SpecFinalizationDraft): Promise<SavedSpecPackage> {
    return this.database.transaction(async (tx) => {
      const db = tx as unknown as Database;
      await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${draft.workflowId}, 2))`);
      const existing = (await db.select().from(taskSpecPackages).where(and(eq(taskSpecPackages.attemptId, draft.attemptId), eq(taskSpecPackages.manifestHash, draft.manifestHash))).limit(1))[0];
      if (existing) return { packageId: existing.id, revision: existing.revision, captureState: existing.captureState, created: false, finalizationId: null };
      const [latest] = await db.select({ revision: sql<number>`coalesce(max(${taskSpecPackages.revision}), 0)::int` }).from(taskSpecPackages).where(and(eq(taskSpecPackages.workflowId, draft.workflowId), eq(taskSpecPackages.stage, draft.stage)));
      const revision = (latest?.revision ?? 0) + 1;
      const [created] = await db.insert(taskSpecPackages).values({ workflowId: draft.workflowId, stage: draft.stage, attemptId: draft.attemptId, revision, parentPackageId: draft.parentPackageId, inputPackageIds: draft.inputPackageIds, manifestHash: draft.manifestHash, captureState: draft.captureState, diagnostics: draft.diagnostics, packageIndex: draft.packageIndex }).returning();
      if (draft.documents.length) await db.insert(taskSpecDocuments).values(draft.documents.map((document) => ({ packageId: created!.id, ...document })));
      const finalizationId = finalization ? await insertFinalization(db, draft, finalization) : null;
      return { packageId: created!.id, revision, captureState: draft.captureState, created: true, finalizationId };
    });
  }
}

async function insertFinalization(db: Database, draft: SpecPackageDraft, finalization: SpecFinalizationDraft) {
  const [row] = await db.insert(taskSpecFinalizations).values({ workflowId: draft.workflowId, workspaceId: finalization.workspaceId, commandId: finalization.commandId, attemptId: draft.attemptId, sourceManifest: { entries: finalization.source }, targetManifest: { packageManifestHash: draft.manifestHash, entries: finalization.target } }).returning({ id: taskSpecFinalizations.id });
  return row!.id;
}
