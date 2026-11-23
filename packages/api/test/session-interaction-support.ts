import { eq } from "drizzle-orm";
import { taskIssueClaims, taskTerminalRequests, taskTerminalSessions } from "../src/infra/database/schema";
import type { PlanningSetup } from "./planning-support";
import type { HarnessOptions } from "./terminal-harness";
import { readySetup } from "./terminal-open-support";
import { openInput } from "./terminal-support";
import { sessionValues, world } from "./terminal-tracking-support";

export const HOST_ID = "maquina:ana";
export const OTHER_HOST_ID = "outra-maquina:ana";

export async function insertFlowDevSession(setup: PlanningSetup, decisionId: string, overrides: Record<string, unknown> = {}) {
  const values = sessionValues(setup, decisionId, { runtime: "flow_dev", hostId: HOST_ID, ...overrides });
  const [session] = await setup.database.insert(taskTerminalSessions).values(values).returning();
  return session!;
}

export async function flowDevWorld(overrides: Record<string, unknown> = {}) {
  const { setup, decisionId } = await world();
  const session = await insertFlowDevSession(setup, decisionId, overrides);
  return { setup, decisionId, session };
}

export async function openedFlowDevSession(options: HarnessOptions = {}) {
  const world = await readySetup(options);
  const { sessionId } = await world.harness.caller.terminal.open(openInput(world.setup));
  const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId };
  return { ...world, sessionId, scope };
}

export async function moveClaimTo(setup: PlanningSetup, userId: string) {
  const [claim] = await setup.database.select().from(taskIssueClaims).where(eq(taskIssueClaims.taskId, setup.taskId));
  await setup.database.delete(taskIssueClaims).where(eq(taskIssueClaims.taskId, setup.taskId));
  await setup.database.insert(taskIssueClaims).values({ ...claim!, id: crypto.randomUUID(), candidateUserId: userId, operatorUserId: userId });
}

export async function setStatus(setup: PlanningSetup, sessionId: string, status: string) {
  await setup.database.update(taskTerminalSessions).set({ status }).where(eq(taskTerminalSessions.id, sessionId));
}

export const QUESTIONS_PAYLOAD = { questions: [
  { question: "Quem pode ver os comentários?", header: "Visibilidade", multiSelect: false, options: [{ label: "Só membros (Recomendado)", description: "d1" }, { label: "Qualquer pessoa", description: "d2" }] },
  { question: "Quais verificações rodar?", header: "Verificações", multiSelect: true, options: [{ label: "lint", description: "" }, { label: "test", description: "" }] },
] };

export const PERMISSION_PAYLOAD = { toolName: "Bash", title: "Rodar comando:", body: "pnpm test", truncated: false, suggestedRule: "Bash(pnpm test:*)", suggestions: [] };

export async function insertPendingRequest(world: { setup: PlanningSetup; sessionId: string }, kind: "question" | "permission", payload: unknown = kind === "question" ? QUESTIONS_PAYLOAD : PERMISSION_PAYLOAD) {
  const values = { sessionId: world.sessionId, kind, toolUseId: `toolu_${crypto.randomUUID()}`, payload };
  const [row] = await world.setup.database.insert(taskTerminalRequests).values(values as never).returning();
  return row!;
}

export async function requestRow(setup: PlanningSetup, requestId: string) {
  const [row] = await setup.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.id, requestId));
  return row!;
}

export async function sessionRowOf(setup: PlanningSetup, sessionId: string) {
  const [row] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId));
  return row!;
}

export async function requestsOf(setup: PlanningSetup, sessionId: string) {
  return setup.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.sessionId, sessionId)).orderBy(taskTerminalRequests.createdAt);
}
