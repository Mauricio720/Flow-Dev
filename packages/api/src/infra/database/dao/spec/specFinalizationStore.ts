import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { LoadedSpecPackage } from "../../../../application/database/dao/taskSpecFinalizationDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import type { ManifestEntry, PromotionStep } from "../../../../application/spec/specWorkspaceGateway";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts, taskSpecDocuments, taskSpecFinalizations, taskSpecPackages, taskSpecStages, taskSpecWorkflows, taskSpecWorkspaces } from "../../schema";
import type { Database } from "../../client";

export async function loadPackage(db: Database, packageId: string): Promise<LoadedSpecPackage> {
  const pkg = (await db.select().from(taskSpecPackages).where(eq(taskSpecPackages.id, packageId)).limit(1))[0];
  if (!pkg) throw new TaskError("spec_unavailable");
  const documents = await db.select().from(taskSpecDocuments).where(eq(taskSpecDocuments.packageId, packageId)).orderBy(asc(taskSpecDocuments.path));
  const pending = (await db.select({ id: taskSpecFinalizations.id }).from(taskSpecFinalizations).where(and(eq(taskSpecFinalizations.attemptId, pkg.attemptId), sql`${taskSpecFinalizations.phase} in ('prepared','installing','installed')`)).orderBy(desc(taskSpecFinalizations.createdAt)).limit(1))[0];
  const entries = documents.map((document) => ({ path: document.path, role: document.role, sha256: document.sha256, bytes: document.byteCount }));
  return { id: pkg.id, workflowId: pkg.workflowId, stage: pkg.stage as SpecStage, attemptId: pkg.attemptId, captureState: pkg.captureState, manifestHash: pkg.manifestHash, entries, files: documents.map((document) => ({ path: document.path, content: document.sourceText })), finalizationId: pending?.id ?? null };
}

export async function priorEntries(db: Database, workflowId: string, stage: SpecStage): Promise<ManifestEntry[]> {
  const [installed] = await db.select({ target: taskSpecFinalizations.targetManifest }).from(taskSpecFinalizations).innerJoin(taskSpecAttempts, eq(taskSpecFinalizations.attemptId, taskSpecAttempts.id)).where(and(eq(taskSpecFinalizations.workflowId, workflowId), eq(taskSpecAttempts.stage, stage), sql`${taskSpecFinalizations.phase} in ('installed','verified')`)).orderBy(desc(taskSpecFinalizations.updatedAt)).limit(1);
  if (installed) return (installed.target as { entries: ManifestEntry[] }).entries;
  const [row] = await db.select({ current: taskSpecStages.currentPackageId }).from(taskSpecStages).where(and(eq(taskSpecStages.workflowId, workflowId), eq(taskSpecStages.stage, stage)));
  return row?.current ? (await loadPackage(db, row.current)).entries : [];
}

export async function recordStep(db: Database, finalizationId: string, step: PromotionStep) {
  await db.update(taskSpecFinalizations).set({ phase: "installing", fileSteps: sql`${taskSpecFinalizations.fileSteps} || ${JSON.stringify([step])}::jsonb`, updatedAt: new Date() }).where(eq(taskSpecFinalizations.id, finalizationId));
}

export async function markPhase(db: Database, finalizationId: string, update: { phase: string; failureReason?: string }) {
  const { phase, failureReason } = update;
  await db.update(taskSpecFinalizations).set({ phase, failureReason: failureReason ?? null, updatedAt: new Date() }).where(eq(taskSpecFinalizations.id, finalizationId));
}

export async function workspaceFor(db: Database, workflowId: string) {
  const [row] = await db.select({ id: taskSpecWorkspaces.id }).from(taskSpecWorkspaces).where(eq(taskSpecWorkspaces.workflowId, workflowId));
  return row?.id ?? null;
}

export async function beginRestore(db: Database, input: { workflowId: string; workspaceId: string; packageId: string }) {
  const pkg = await loadPackage(db, input.packageId);
  const [row] = await db.insert(taskSpecFinalizations).values({ workflowId: input.workflowId, workspaceId: input.workspaceId, attemptId: pkg.attemptId, sourceManifest: { entries: await priorEntries(db, input.workflowId, pkg.stage) }, targetManifest: { packageManifestHash: pkg.manifestHash, entries: pkg.entries } }).returning({ id: taskSpecFinalizations.id });
  return row!.id;
}

export async function markReviewReady(db: Database, input: { packageId: string; workflowId: string; stage: SpecStage; finalizationId: string; installedManifestHash: string }) {
  await db.update(taskSpecPackages).set({ captureState: "installed" }).where(eq(taskSpecPackages.id, input.packageId));
  await db.update(taskSpecPackages).set({ captureState: "review_ready", readinessVersion: sql`${taskSpecPackages.readinessVersion} + 1` }).where(eq(taskSpecPackages.id, input.packageId));
  await db.update(taskSpecStages).set({ state: "review", previousCompletePackageId: sql`${taskSpecStages.currentPackageId}`, currentPackageId: input.packageId, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, input.workflowId), eq(taskSpecStages.stage, input.stage)));
  await db.update(taskSpecWorkflows).set({ state: "review", version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, input.workflowId));
  await db.update(taskSpecWorkspaces).set({ installedManifestHash: input.installedManifestHash, updatedAt: new Date() }).where(eq(taskSpecWorkspaces.workflowId, input.workflowId));
  await db.update(taskSpecFinalizations).set({ phase: "verified", verifiedAt: new Date(), updatedAt: new Date() }).where(eq(taskSpecFinalizations.id, input.finalizationId));
}
