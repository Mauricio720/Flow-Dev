import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { InsertPendingInput, ProposalContext, RouteSwitchRecord } from "../../../../application/database/dao/routeSwitchDao";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import { CONFIRMED_ROUTE_SWITCH_STATUS } from "../../../../application/terminal/routeSwitch";
import type { SessionPurposeKind } from "../../../../application/terminal/sessionPurposeKind";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskPlanningDecisions, taskRouteSwitches, taskTerminalRequests, taskTerminalSessions, tasks, users } from "../../schema";
import { DrizzleTaskSetReadDao } from "../artifacts/drizzleTaskSetReadDao";

const PENDING = "pending";
const DECLINED = "declined";
const QUESTION = "question";
const ANSWERED = "answered";

function toRecord(row: typeof taskRouteSwitches.$inferSelect & { decidingName: string | null; decidingDisplayName: string | null }): RouteSwitchRecord {
  return { ...row, fromRoute: row.fromRoute as RouteSwitchRecord["fromRoute"], toRoute: "direct_execution", reasons: row.reasons as string[], status: row.status as RouteSwitchRecord["status"], decidedByName: row.decidingDisplayName ?? row.decidingName };
}

export async function readProposalContext(database: Database, sessionId: string): Promise<ProposalContext | null> {
  const [row] = await database.select({ session: taskTerminalSessions, currentDecisionId: tasks.planningDecisionId }).from(taskTerminalSessions).innerJoin(tasks, eq(tasks.id, taskTerminalSessions.taskId)).where(eq(taskTerminalSessions.id, sessionId)).limit(1);
  if (!row) return null;
  return buildProposalContext(database, row.session, row.currentDecisionId);
}

async function buildProposalContext(database: Database, session: typeof taskTerminalSessions.$inferSelect, currentDecisionId: string | null): Promise<ProposalContext> {
  const [confirmed, pending, declined, answered, specs] = await Promise.all([
    currentDecisionId ? database.select({ id: taskRouteSwitches.id }).from(taskRouteSwitches).where(and(eq(taskRouteSwitches.planningDecisionId, currentDecisionId), eq(taskRouteSwitches.status, CONFIRMED_ROUTE_SWITCH_STATUS))).limit(1) : [],
    database.select({ id: taskRouteSwitches.id }).from(taskRouteSwitches).where(and(eq(taskRouteSwitches.sessionId, session.id), eq(taskRouteSwitches.status, PENDING))).limit(1),
    database.select({ decidedAt: taskRouteSwitches.decidedAt }).from(taskRouteSwitches).where(and(eq(taskRouteSwitches.sessionId, session.id), eq(taskRouteSwitches.status, DECLINED))).orderBy(desc(taskRouteSwitches.decidedAt)).limit(1),
    database.select({ answeredAt: taskTerminalRequests.answeredAt }).from(taskTerminalRequests).where(and(eq(taskTerminalRequests.sessionId, session.id), eq(taskTerminalRequests.kind, QUESTION), eq(taskTerminalRequests.status, ANSWERED), isNotNull(taskTerminalRequests.answeredAt))).orderBy(desc(taskTerminalRequests.answeredAt)).limit(1),
    new DrizzleTaskSetReadDao(database).specs(session.taskId),
  ]);
  return { session: { id: session.id, taskId: session.taskId, projectId: session.projectId, purpose: session.purpose as SessionPurposeKind, route: session.route as PlanningRoute, status: session.status as TerminalSessionStatus }, currentDecisionId, hasConfirmedSwitch: confirmed.length > 0, hasCapturedSpec: specs.length > 0, hasPendingProposal: pending.length > 0, lastDeclinedAt: declined[0]?.decidedAt ?? null, lastAnsweredAt: answered[0]?.answeredAt ?? null };
}

export async function insertPending(database: Database, input: InsertPendingInput): Promise<{ created: boolean; record: RouteSwitchRecord }> {
  const [inserted] = await database.insert(taskRouteSwitches).values({ ...input, toRoute: "direct_execution", status: PENDING }).onConflictDoNothing().returning();
  if (inserted) return { created: true, record: await findRecord(database, eq(taskRouteSwitches.id, inserted.id)) as RouteSwitchRecord };
  const existing = await findRecord(database, and(eq(taskRouteSwitches.sessionId, input.sessionId), eq(taskRouteSwitches.status, PENDING)));
  if (!existing) throw new Error("Pending route switch disappeared after a conflict");
  return { created: false, record: existing };
}

async function findRecord(database: Database, filter: ReturnType<typeof eq> | ReturnType<typeof and>): Promise<RouteSwitchRecord | null> {
  const [row] = await database.select({ record: taskRouteSwitches, decidingName: users.name, decidingDisplayName: users.displayName }).from(taskRouteSwitches).leftJoin(users, eq(users.id, taskRouteSwitches.decidedByUserId)).where(filter).limit(1);
  return row ? toRecord({ ...row.record, decidingName: row.decidingName, decidingDisplayName: row.decidingDisplayName }) : null;
}

export async function findById(database: Database, id: string) {
  return findRecord(database, eq(taskRouteSwitches.id, id));
}

export async function listByTask(database: Database, taskId: string) {
  const rows = await database.select({ record: taskRouteSwitches, decidingName: users.name, decidingDisplayName: users.displayName }).from(taskRouteSwitches).leftJoin(users, eq(users.id, taskRouteSwitches.decidedByUserId)).where(eq(taskRouteSwitches.taskId, taskId)).orderBy(taskRouteSwitches.proposedAt, taskRouteSwitches.id);
  return rows.map((row) => toRecord({ ...row.record, decidingName: row.decidingName, decidingDisplayName: row.decidingDisplayName }));
}

export async function findConfirmedForDecision(database: Database, planningDecisionId: string) {
  return findRecord(database, and(eq(taskRouteSwitches.planningDecisionId, planningDecisionId), eq(taskRouteSwitches.status, CONFIRMED_ROUTE_SWITCH_STATUS)));
}
