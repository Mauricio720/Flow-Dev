import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import type { LocalExecutionEvidenceDao } from "../../../../application/database/dao/localExecutionEvidenceDao";
import { LocalExecutionError } from "../../../../application/services/local-execution/localExecutionErrors";
import { sanitizeEvidence } from "../../../../application/services/local-execution/evidenceSanitizer";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import { taskExecutionRuns, taskRunEvidence, taskRunGates } from "../../schema";
import type { Database } from "../../client";

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class DrizzleLocalExecutionEvidenceDao implements LocalExecutionEvidenceDao {
  constructor(private readonly database: Database) {}

  async gates(input: { taskId: string; runId: string; cursor?: string; limit: number }) {
    const cursor = decodeCursor(input.cursor);
    const cursorPrefix = `${input.taskId}:${input.runId}:`;
    const cursorDate = cursor?.key.startsWith(cursorPrefix) ? cursor.key.slice(cursorPrefix.length) : null;
    if (input.cursor && (!cursor?.id || !UUID.test(cursor.id) || !cursorDate || Number.isNaN(Date.parse(cursorDate)))) throw new LocalExecutionError("invalid_cursor");
    const [run] = await this.database.select({ id: taskExecutionRuns.id }).from(taskExecutionRuns).where(and(eq(taskExecutionRuns.id, input.runId), eq(taskExecutionRuns.taskId, input.taskId))).limit(1);
    if (!run) return null;
    const after = cursor && cursorDate ? or(gt(taskRunGates.createdAt, new Date(cursorDate)), and(eq(taskRunGates.createdAt, new Date(cursorDate)), gt(taskRunGates.id, cursor.id!))) : undefined;
    const [all, page] = await Promise.all([
      this.database.select({ state: taskRunGates.state }).from(taskRunGates).where(eq(taskRunGates.runId, input.runId)),
      this.database.select().from(taskRunGates).where(and(eq(taskRunGates.runId, input.runId), after)).orderBy(asc(taskRunGates.createdAt), asc(taskRunGates.id)).limit(input.limit + 1),
    ]);
    const rows = page.slice(0, input.limit);
    const last = page.length > input.limit ? rows.at(-1) : undefined;
    const summary = all.length === 0 ? "unrun" : all.some((row) => row.state === "failed") ? "failed" : all.some((row) => ["blocked", "unknown", "unrun"].includes(row.state)) ? "blocked" : all.every((row) => row.state === "passed") ? "passed" : "running";
    return {
      items: rows.map((row) => ({ gateId: row.gateId, attempt: row.attempt, required: row.required, state: row.state, reason: row.reason, manifestHash: row.manifestHash, checkedCheckoutDigest: row.checkoutDigest, exitCode: row.exitCode, startedAt: row.startedAt?.toISOString() ?? null, finishedAt: row.finishedAt?.toISOString() ?? null })),
      summary,
      nextCursor: last ? encodeCursor({ key: `${input.taskId}:${input.runId}:${last.createdAt.toISOString()}`, id: last.id }) : null,
    };
  }

  async evidence(input: { taskId: string; runId: string; evidenceId: string }) {
    const [row] = await this.database.select({ id: taskRunEvidence.id, kind: taskRunEvidence.kind, relativeLabel: taskRunEvidence.relativeLabel, contentHash: taskRunEvidence.contentHash, safePayload: taskRunEvidence.safePayload }).from(taskRunEvidence)
      .innerJoin(taskExecutionRuns, eq(taskExecutionRuns.id, taskRunEvidence.runId))
      .where(and(eq(taskExecutionRuns.taskId, input.taskId), eq(taskRunEvidence.runId, input.runId), eq(taskRunEvidence.id, input.evidenceId), eq(taskRunEvidence.visibility, "shared"))).limit(1);
    if (!row || !row.safePayload) return null;
    const payload = row.safePayload as Record<string, unknown>;
    const content = typeof payload.content === "string" ? payload.content : typeof payload.summary === "string" ? payload.summary : null;
    if (content === null) return null;
    const kind = row.kind === "test-summary" ? "test_summary" : row.kind;
    try {
      const safe = sanitizeEvidence({ kind, label: row.relativeLabel, content, privatePaths: [], secrets: [] });
      return { id: row.id, kind: row.kind.replaceAll("_", "-"), safeContentHash: row.contentHash, label: safe.label, content: safe.content };
    } catch { return null; }
  }
}
