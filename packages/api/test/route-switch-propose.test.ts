import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { RouteSwitchService } from "../src/application/services/terminal/routeSwitchService";
import { DrizzleRouteSwitchDao } from "../src/infra/database/dao/terminal/drizzleRouteSwitchDao";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { taskArtifactVersions, taskArtifacts, taskRouteSwitches, taskTerminalMessages, taskTerminalRequests, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import type { SessionLog, SessionLogFields } from "../src/application/services/terminal/sessionLog";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const NOW = new Date("2026-11-25T10:05:00Z");
const VALID_BLOCK = { valid: true as const, summary: "Mudança de texto em uma tela, sem regra nova.", reasons: ["As respostas fixaram o texto e a tela.", "Segue o padrão de planningCopy.ts."] };

async function proposalWorld(sessionOverrides: Record<string, unknown> = {}) {
  const { setup, decisionId } = await world();
  await setup.database.update(tasks).set({ planningDecisionId: decisionId }).where(eq(tasks.id, setup.taskId));
  const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { route: "prd", status: "waiting", ...sessionOverrides })).returning();
  const entries: Array<{ event: string; fields: SessionLogFields }> = [];
  const log: SessionLog = { info: (event, fields = {}) => entries.push({ event, fields }), error: () => undefined };
  const service = new RouteSwitchService({ routeSwitches: new DrizzleRouteSwitchDao(setup.database), messages: new DrizzleSessionMessageDao(setup.database), log, now: () => NOW });
  return { setup, decisionId, session: session!, service, entries };
}

async function captureSpec(setup: Awaited<ReturnType<typeof world>>["setup"]) {
  const [artifact] = await setup.database.insert(taskArtifacts).values({ taskId: setup.taskId, projectId: setup.project.id, relativePath: "docs/spec.md" }).returning();
  await setup.database.insert(taskArtifactVersions).values({ artifactId: artifact!.id, version: 1, skill: "spec-writer", content: "Spec capturada", sha256: "a".repeat(64), byteSize: 1, trigger: "stop" });
}

async function propose({ service, session }: Awaited<ReturnType<typeof proposalWorld>>, assistantMessageId: string, block = VALID_BLOCK) {
  return service.propose({ sessionId: session.id, assistantMessageId, block });
}

describe("RouteSwitchService.propose", () => {
  it("V-03a creates one pending proposal and logs its identifiers", async () => {
    const context = await proposalWorld();
    const result = await propose(context, crypto.randomUUID());
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.sessionId, context.session.id));
    expect(result).toEqual({ kind: "proposed", proposalId: proposal!.id });
    expect(proposal).toMatchObject({ fromRoute: "prd", toRoute: "direct_execution", summary: VALID_BLOCK.summary, reasons: VALID_BLOCK.reasons, status: "pending", proposedAt: NOW });
    expect(context.entries).toEqual([{ event: "route_switch_proposed", fields: { sessionId: context.session.id, taskId: context.setup.taskId, proposalId: proposal!.id } }]);
  });

  it("V-04a discards a proposal when a captured spec exists", async () => {
    const context = await proposalWorld();
    await captureSpec(context.setup);
    const result = await propose(context, crypto.randomUUID());
    const [message] = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(result).toEqual({ kind: "discarded", reason: "spec_exists" });
    expect(message!.content).toBe("A proposta de troca não foi aceita: já existe spec deste trabalho. Continue com a spec.");
    expect(context.entries[0]).toMatchObject({ event: "route_switch_discarded", fields: { sessionId: context.session.id, reason: "spec_exists" } });
  });

  it("V-04b discards after a confirmed switch for the current decision", async () => {
    const context = await proposalWorld();
    await context.setup.database.insert(taskRouteSwitches).values({ taskId: context.setup.taskId, planningDecisionId: context.decisionId, sessionId: context.session.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Resumo", reasons: ["Motivo"], status: "confirmed", decidedByUserId: context.setup.ownerId, decidedAt: NOW, decisionRequestKey: crypto.randomUUID() });
    await propose(context, crypto.randomUUID());
    const [message] = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(message!.content).toBe("A proposta de troca não foi aceita: este trabalho já foi trocado. Continue com a spec.");
  });

  it("V-04c requires a new answered question after a decline", async () => {
    const context = await proposalWorld();
    await context.setup.database.insert(taskRouteSwitches).values({ taskId: context.setup.taskId, planningDecisionId: context.decisionId, sessionId: context.session.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Resumo", reasons: ["Motivo"], status: "declined", decidedByUserId: context.setup.ownerId, decidedAt: new Date("2026-11-25T10:00:00Z"), decisionRequestKey: crypto.randomUUID() });
    const first = await propose(context, crypto.randomUUID());
    await context.setup.database.insert(taskTerminalRequests).values({ sessionId: context.session.id, kind: "question", toolUseId: "question-1", payload: {}, status: "answered", answer: {}, answeredBy: context.setup.ownerId, answeredAt: new Date("2026-11-25T10:03:00Z") });
    const second = await propose(context, crypto.randomUUID());
    const messages = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(first).toEqual({ kind: "discarded", reason: "declined_without_answer" });
    expect(second.kind).toBe("proposed");
    expect(messages[0]!.content).toBe("A proposta de troca não foi aceita: a troca já foi recusada e não houve resposta nova. Continue com a spec.");
  });

  it("V-04d and V-04e discard malformed blocks once per assistant message", async () => {
    const context = await proposalWorld();
    const assistantMessageId = crypto.randomUUID();
    const invalid = await propose(context, assistantMessageId, { valid: false });
    const repeated = await propose(context, assistantMessageId, { valid: false });
    const messages = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(invalid).toEqual({ kind: "discarded", reason: "malformed" });
    expect(repeated).toEqual(invalid);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.content).toBe("A proposta de troca não foi aceita: o bloco veio fora do formato. Continue com a spec.");
  });
});
