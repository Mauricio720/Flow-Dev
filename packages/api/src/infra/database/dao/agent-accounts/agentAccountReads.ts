import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { agentAccounts, taskTerminalSessions } from "../../schema";
import type { AgentAccountRecord } from "../../../../application/agent-accounts/agentAccountTypes";
import { FINAL_SESSION_STATUSES } from "../../../../application/terminal/terminalSessionStatus";

export function toAgentAccountRecord(row: typeof agentAccounts.$inferSelect): AgentAccountRecord {
  return { ...row, provider: row.provider as AgentAccountRecord["provider"], status: row.status as AgentAccountRecord["status"] };
}

export async function listAgentAccounts(database: Database, ownerUserId: string, hostId: string) {
  const rows = await database.select().from(agentAccounts).where(and(eq(agentAccounts.ownerUserId, ownerUserId), eq(agentAccounts.hostId, hostId), isNull(agentAccounts.removedAt))).orderBy(agentAccounts.createdAt);
  return rows.map(toAgentAccountRecord);
}

export async function listLoggedInCodexAccounts(database: Database, hostId: string) {
  const rows = await database.select().from(agentAccounts).where(and(eq(agentAccounts.hostId, hostId), eq(agentAccounts.provider, "codex"), eq(agentAccounts.status, "logged_in"), isNull(agentAccounts.removedAt))).orderBy(agentAccounts.createdAt);
  return rows.map(toAgentAccountRecord);
}

export async function findAgentAccount(database: Database, id: string) {
  const [row] = await database.select().from(agentAccounts).where(eq(agentAccounts.id, id)).limit(1);
  return row ? toAgentAccountRecord(row) : null;
}

export async function countAgentAccountSessions(database: Database, id: string) {
  const [result] = await database.select({ count: sql<number>`count(*)::int` }).from(taskTerminalSessions).where(and(eq(taskTerminalSessions.agentAccountId, id), notInArray(taskTerminalSessions.status, [...FINAL_SESSION_STATUSES])));
  return Number(result?.count ?? 0);
}
