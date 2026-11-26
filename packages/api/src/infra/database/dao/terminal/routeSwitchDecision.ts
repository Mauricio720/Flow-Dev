import { and, eq } from "drizzle-orm";
import type { DecideInput, DecideOutcome, RouteSwitchRecord } from "../../../../application/database/dao/routeSwitchDao";
import type { Database } from "../../client";
import { taskRouteSwitches } from "../../schema";
import { DrizzleSessionMessageDao } from "./drizzleSessionMessageDao";
import { findById } from "./routeSwitchReads";

const PENDING = "pending";
const UNIQUE_VIOLATION_CODE = "23505";
const SINGLE_CONFIRMATION_CONSTRAINT = "task_route_switches_decision_confirmed_unique";

type DriverError = { code?: string; constraint_name?: string };

function decidedStatus(decision: DecideInput["decision"]) {
  return decision === "confirm" ? "confirmed" : "declined";
}

function isSecondConfirmation(error: unknown) {
  const candidate = error as ({ cause?: DriverError } & DriverError) | null | undefined;
  const driverError = candidate?.cause ?? candidate;
  return driverError?.code === UNIQUE_VIOLATION_CODE && driverError.constraint_name === SINGLE_CONFIRMATION_CONSTRAINT;
}

async function updatePending(database: Database, input: DecideInput) {
  const [row] = await database.update(taskRouteSwitches).set({ status: decidedStatus(input.decision), decidedByUserId: input.actorId, decidedAt: input.decidedAt, decisionRequestKey: input.requestKey }).where(and(eq(taskRouteSwitches.id, input.proposalId), eq(taskRouteSwitches.sessionId, input.sessionId), eq(taskRouteSwitches.status, PENDING))).returning({ id: taskRouteSwitches.id });
  return row ?? null;
}

async function existingOutcome(database: Database, input: DecideInput): Promise<DecideOutcome> {
  const record = await findById(database, input.proposalId);
  if (!record || record.sessionId !== input.sessionId) return { outcome: "not_found", record: null };
  return record.decisionRequestKey === input.requestKey ? { outcome: "replayed", record } : { outcome: "already_decided", record };
}

async function insertDecisionMessage(database: Database, input: DecideInput) {
  const inserted = await new DrizzleSessionMessageDao(database).insertUserMessage({ sessionId: input.sessionId, content: input.message, requestKey: input.requestKey });
  if (!inserted.created) throw new Error("route_switch_message_conflict");
}

async function decideInTransaction(database: Database, input: DecideInput): Promise<DecideOutcome> {
  if (!await updatePending(database, input)) return existingOutcome(database, input);
  await insertDecisionMessage(database, input);
  const record = await findById(database, input.proposalId) as RouteSwitchRecord;
  return { outcome: "decided", record };
}

export async function decideRouteSwitch(database: Database, input: DecideInput): Promise<DecideOutcome> {
  try {
    return await database.transaction((tx) => decideInTransaction(tx as unknown as Database, input));
  } catch (error) {
    if (!isSecondConfirmation(error)) throw error;
    return existingOutcome(database, input);
  }
}
