import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { SpecPageQuery } from "../../../../application/database/dao/taskSpecDao";
import { decodeTaskCursor, encodeTaskCursor } from "../../../../application/pagination/taskCursor";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecApprovals, taskSpecDocuments, taskSpecPackages, taskSpecStages } from "../../schema";
import type { ReviewBlock } from "../../../../application/spec/documents/specDocumentTypes";
import { buildSections } from "../../../../application/spec/documents/specReviewModel";
import { specPackageDiff } from "../../../../application/spec/documents/specPackageDiff";
import type { Database } from "../../client";
import { findWorkflowId } from "./specReads";

type PackageRow = typeof taskSpecPackages.$inferSelect;

function toPackage(row: PackageRow) {
  return { id: row.id, stage: row.stage as SpecStage, attemptId: row.attemptId, revision: row.revision, manifestHash: row.manifestHash, captureState: row.captureState, createdAt: row.createdAt };
}

export async function readSpecPackages(database: Database, input: SpecPageQuery) {
  const workflowId = await findWorkflowId(database, input);
  const cursor = decodeTaskCursor(input.cursor, "spec_packages", workflowId, "before");
  const filters = [eq(taskSpecPackages.workflowId, workflowId)];
  if (cursor) filters.push(sql`(${taskSpecPackages.createdAt}, ${taskSpecPackages.id}) < (${cursor.position}::timestamptz, ${cursor.id ?? ""}::uuid)`);
  const rows = await database.select({ row: taskSpecPackages, position: sql<string>`to_char(${taskSpecPackages.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` }).from(taskSpecPackages).where(and(...filters)).orderBy(desc(taskSpecPackages.createdAt), desc(taskSpecPackages.id)).limit(input.limit + 1);
  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  const nextCursor = rows.length > input.limit && last ? encodeTaskCursor({ kind: "spec_packages", scope: workflowId, position: last.position, id: last.row.id, direction: "before" }) : null;
  return { items: page.map((item) => toPackage(item.row)), nextCursor };
}

export async function readSpecPackage(database: Database, scope: { projectId: string; taskId: string; packageId: string }) {
  const workflowId = await findWorkflowId(database, scope);
  const row = (await database.select().from(taskSpecPackages).where(and(eq(taskSpecPackages.workflowId, workflowId), eq(taskSpecPackages.id, scope.packageId))).limit(1))[0];
  if (!row) throw new TaskError("spec_unavailable");
  const documents = await database.select().from(taskSpecDocuments).where(eq(taskSpecDocuments.packageId, row.id)).orderBy(asc(taskSpecDocuments.path));
  const [stage] = await database.select({ current: taskSpecStages.currentPackageId, approved: taskSpecStages.approvedPackageId, state: taskSpecStages.state }).from(taskSpecStages).where(and(eq(taskSpecStages.workflowId, workflowId), eq(taskSpecStages.stage, row.stage)));
  const [approval] = await database.select().from(taskSpecApprovals).where(eq(taskSpecApprovals.packageId, row.id));
  const index = row.packageIndex as { stories?: unknown[]; tests?: unknown[]; tasks?: unknown[]; decisions?: unknown[] };
  const [parent] = row.parentPackageId ? await database.select({ manifestHash: taskSpecPackages.manifestHash }).from(taskSpecPackages).where(eq(taskSpecPackages.id, row.parentPackageId)) : [];
  const previous = row.parentPackageId ? await database.select().from(taskSpecDocuments).where(eq(taskSpecDocuments.packageId, row.parentPackageId)) : [];
  const blocksOf = (items: (typeof documents)) => items.map((item) => ({ path: item.path, blocks: item.blocks as ReviewBlock[] }));
  return {
    ...toPackage(row), packageIndex: row.packageIndex, diagnostics: row.diagnostics, diffSummary: row.diffSummary,
    parentPackageId: row.parentPackageId, parentManifestHash: parent?.manifestHash ?? null,
    isCurrent: stage?.current === row.id && stage.state === "review", approval: approval ? { approverUserId: approval.approverUserId, approvedAt: approval.approvedAt } : null,
    relations: { stories: index.stories ?? [], tests: index.tests ?? [], tasks: index.tasks ?? [] }, decisions: index.decisions ?? [],
    sections: documents.map((item) => ({ documentId: item.id, path: item.path, sections: buildSections(item.blocks as ReviewBlock[], []) })),
    diff: specPackageDiff(blocksOf(previous), blocksOf(documents)),
    documents: documents.map((item) => ({ id: item.id, path: item.path, role: item.role, sha256: item.sha256, byteCount: item.byteCount })),
  };
}

export async function readSpecDocument(database: Database, input: { projectId: string; taskId: string; packageId: string; documentId: string; cursor?: string; limit: number }) {
  const workflowId = await findWorkflowId(database, input);
  const row = (await database.select({ document: taskSpecDocuments }).from(taskSpecDocuments).innerJoin(taskSpecPackages, eq(taskSpecDocuments.packageId, taskSpecPackages.id)).where(and(eq(taskSpecPackages.workflowId, workflowId), eq(taskSpecDocuments.packageId, input.packageId), eq(taskSpecDocuments.id, input.documentId))).limit(1))[0]?.document;
  if (!row) throw new TaskError("spec_unavailable");
  const cursor = decodeTaskCursor(input.cursor, "spec_blocks", row.id, "after");
  const start = cursor ? Number(cursor.position) : 0;
  const end = start + input.limit;
  const nextCursor = end < row.blocks.length ? encodeTaskCursor({ kind: "spec_blocks", scope: row.id, position: String(end), direction: "after" }) : null;
  return { id: row.id, path: row.path, role: row.role, sha256: row.sha256, byteCount: row.byteCount, sourceText: row.sourceText, blocks: row.blocks.slice(start, end), nextCursor, totalBlocks: row.blocks.length };
}
