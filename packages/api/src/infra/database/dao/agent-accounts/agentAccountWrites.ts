import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { agentAccounts } from "../../schema";
import { AgentAccountLabelTaken, type CreateAgentAccountInput, type SaveAgentAccountCheckInput } from "../../../../application/agent-accounts/agentAccountDao";
import { countAgentAccountSessions, toAgentAccountRecord } from "./agentAccountReads";

const LABEL_CONSTRAINT = "agent_accounts_active_label_unique";

function isLabelConflict(error: unknown) {
  const candidate = error as { cause?: { code?: string; constraint_name?: string }; code?: string; constraint_name?: string };
  const driver = candidate.cause ?? candidate;
  return driver.code === "23505" && driver.constraint_name === LABEL_CONSTRAINT;
}

export async function insertAgentAccount(database: Database, input: CreateAgentAccountInput) {
  try {
    const [row] = await database.insert(agentAccounts).values(input).returning();
    return toAgentAccountRecord(row!);
  } catch (error) {
    if (isLabelConflict(error)) throw new AgentAccountLabelTaken();
    throw error;
  }
}

export async function renameAgentAccount(database: Database, input: { id: string; label: string; version: number }) {
  try {
    const [row] = await database.update(agentAccounts).set({ label: input.label, version: sql`${agentAccounts.version} + 1` }).where(and(eq(agentAccounts.id, input.id), eq(agentAccounts.version, input.version), isNull(agentAccounts.removedAt))).returning();
    return row ? toAgentAccountRecord(row) : null;
  } catch (error) {
    if (isLabelConflict(error)) throw new AgentAccountLabelTaken();
    throw error;
  }
}

export async function saveAgentAccountCheck(database: Database, input: SaveAgentAccountCheckInput) {
  const [row] = await database.update(agentAccounts).set({ status: input.status, identity: input.identity, plan: input.plan, codexCatalog: input.codexCatalog, checkedAt: input.checkedAt }).where(and(eq(agentAccounts.id, input.id), isNull(agentAccounts.removedAt))).returning();
  return row ? toAgentAccountRecord(row) : null;
}

export async function markAgentAccountRemoved(database: Database, input: { id: string; at: Date }) {
  await database.update(agentAccounts).set({ removedAt: input.at }).where(and(eq(agentAccounts.id, input.id), isNull(agentAccounts.removedAt)));
}

export async function markAgentAccountRemovedIfIdle(database: Database, input: { id: string; at: Date }) {
  return database.transaction(async (tx) => {
    const transaction = tx as unknown as Database;
    const [account] = await transaction.select({ id: agentAccounts.id }).from(agentAccounts).where(and(eq(agentAccounts.id, input.id), isNull(agentAccounts.removedAt))).for("update");
    if (!account) return { removed: false, openSessionCount: 0 };
    const count = await countAgentAccountSessions(transaction, input.id);
    if (count > 0) return { removed: false, openSessionCount: count };
    await transaction.update(agentAccounts).set({ removedAt: input.at }).where(eq(agentAccounts.id, input.id));
    return { removed: true, openSessionCount: 0 };
  });
}
