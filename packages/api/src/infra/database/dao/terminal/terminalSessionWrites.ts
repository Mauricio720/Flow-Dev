import { and, eq, isNotNull } from "drizzle-orm";
import type { CreateTerminalSessionInput, CreatedTerminalSession, TerminalSessionRecord } from "../../../../application/database/dao/terminalSessionDao";
import type { SessionAgent } from "../../../../application/terminal/sessionAgentCatalog";
import type { PermissionMode, SessionRuntimeKind } from "../../../../application/terminal/sessionInteraction";
import type { SessionPurposeKind } from "../../../../application/terminal/sessionPurposeKind";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";

const OPENING_STATUS = "opening";

export function toSessionRecord(row: typeof taskTerminalSessions.$inferSelect): TerminalSessionRecord {
  return { ...row, agentSessionId: row.claudeSessionId, route: row.route as PlanningRoute, status: row.status as TerminalSessionStatus, runtime: row.runtime as SessionRuntimeKind, permissionMode: row.permissionMode as PermissionMode, purpose: row.purpose as SessionPurposeKind, agent: row.agent as SessionAgent };
}

export async function findSessionByRequestKey(database: Database, userId: string, requestKey: string) {
  const filter = and(eq(taskTerminalSessions.userId, userId), eq(taskTerminalSessions.requestKey, requestKey));
  const [row] = await database.select().from(taskTerminalSessions).where(filter).limit(1);
  return row ? toSessionRecord(row) : null;
}

function choiceColumns(input: CreateTerminalSessionInput) {
  return { purpose: input.purpose ?? "route", planItemId: input.planItemId ?? null, agent: input.agent ?? "claude", model: input.model ?? null, effort: input.effort ?? null, agentVersion: input.agentVersion ?? null, reviewCycleId: input.reviewCycleId ?? null };
}

async function relaunch(database: Database, existing: TerminalSessionRecord, input: CreateTerminalSessionInput): Promise<CreatedTerminalSession> {
  const now = new Date();
  const changes = { checkoutPath: input.checkoutPath, branch: input.branch, dirty: input.dirty, openedAt: now, lastSignalAt: now, launchFailedAt: null, launchError: null, status: OPENING_STATUS, tokenHash: null, runtime: input.runtime, permissionMode: input.permissionMode, hostId: input.hostId, workerId: null, interruptRequestedAt: null, endRequestedAt: null, preparedAt: null, ...choiceColumns(input) };
  const filter = and(eq(taskTerminalSessions.id, existing.id), isNotNull(taskTerminalSessions.launchFailedAt));
  const [updated] = await database.update(taskTerminalSessions).set(changes).where(filter).returning();
  return updated ? { session: toSessionRecord(updated), created: true } : { session: existing, created: false };
}

export async function insertOrRelaunch(database: Database, input: CreateTerminalSessionInput): Promise<CreatedTerminalSession> {
  const [inserted] = await database.insert(taskTerminalSessions).values(input).onConflictDoNothing().returning();
  if (inserted) return { session: toSessionRecord(inserted), created: true };
  const existing = await findSessionByRequestKey(database, input.userId, input.requestKey);
  if (!existing) throw new Error("Terminal session disappeared after a conflict");
  if (!existing.launchFailedAt) return { session: existing, created: false };
  return relaunch(database, existing, input);
}
