import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { SessionControlsStep } from "../src/application/services/terminal/sessionControls";
import { SessionHandleRegistry } from "../src/application/services/terminal/sessionHandleRegistry";
import { DrizzleSessionControlDao } from "../src/infra/database/dao/terminal/drizzleSessionControlDao";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { DrizzleSessionStatusDao } from "../src/infra/database/dao/terminal/drizzleSessionStatusDao";
import { taskTerminalMessages } from "../src/infra/database/schema";
import { controlRuntime, cleanupControlRoots, processAlive, startControlRuntime, waitForFile, waitUntilDead } from "./support/codexControlsSupport";
import { flowDevWorld, HOST_ID, insertFlowDevSession, insertPendingRequest, requestRow, sessionRowOf } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

const roots: string[] = [];
afterEach(async () => { await closeTaskFixture(); await cleanupControlRoots(roots.splice(0)); });

describe("Codex session controls", () => {
  it("V-49c/V-49d interrupts the active turn and closes only its process group", async () => {
    const { setup, decisionId, session: first } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, model: "model-1", effort: "high", status: "running" });
    const second = await insertFlowDevSession(setup, decisionId, { agent: "codex", hostId: HOST_ID, model: "model-1", effort: "high", status: "running" });
    const left = await controlRuntime();
    const right = await controlRuntime();
    roots.push(left.root, right.root);
    const leftHandle = startControlRuntime(left.paths.script);
    const rightHandle = startControlRuntime(right.paths.script);
    const registry = new SessionHandleRegistry();
    registry.set(first.id, leftHandle);
    registry.set(second.id, rightHandle);
    try {
      await Promise.all([waitForFile(left.paths.requests, "turn/start"), waitForFile(right.paths.requests, "turn/start"), waitForFile(left.paths.childPid), waitForFile(right.paths.childPid)]);
      const pendingId = await interruptFirst({ setup, firstId: first.id, registry });
      await expect(sessionRowOf(setup, first.id)).resolves.toMatchObject({ status: "waiting", interruptRequestedAt: null });
      await expect(requestRow(setup, pendingId)).resolves.toMatchObject({ status: "cancelled" });
      const messages = await setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, first.id));
      expect(messages.filter((message) => message.role === "system").map((message) => message.content)).toContain("Interrompido por você");
      await expect(sessionRowOf(setup, second.id)).resolves.toMatchObject({ status: "running" });
      await closeFirst({ setup, firstId: first.id, secondId: second.id, registry });
      const leftPid = Number(await waitForFile(left.paths.childPid));
      const rightPid = Number(await waitForFile(right.paths.childPid));
      await waitUntilDead(leftPid);
      expect(processAlive(rightPid)).toBe(true);
      await closeSecond({ setup, secondId: second.id, registry });
      await waitUntilDead(rightPid);
      const calls = (await readFile(left.paths.requests, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { method: string; params: unknown });
      expect(calls.find((call) => call.method === "turn/interrupt")?.params).toEqual({ threadId: "thread-1", turnId: "turn-1" });
    } finally { await Promise.all([leftHandle.close(), rightHandle.close()]); }
  });
});

async function interruptFirst(input: { setup: Awaited<ReturnType<typeof flowDevWorld>>["setup"]; firstId: string; registry: SessionHandleRegistry }) {
  const { setup, firstId, registry } = input;
  const requests = new DrizzleSessionRequestDao(setup.database);
  const request = await insertPendingRequest({ setup, sessionId: firstId }, "question");
  await runControlStep({ setup, registry, cancel: { pendingIds: (id) => requests.pendingIds(id), cancelAll: (id) => requests.cancelPending(id, new Date()) } }, async (controls) => controls.requestInterrupt(firstId, new Date()));
  return request.id;
}

async function closeFirst(input: { setup: Awaited<ReturnType<typeof flowDevWorld>>["setup"]; firstId: string; secondId: string; registry: SessionHandleRegistry }) {
  await runControlStep(input, async (controls) => controls.requestEnd(input.firstId, new Date()));
}

async function closeSecond(input: { setup: Awaited<ReturnType<typeof flowDevWorld>>["setup"]; secondId: string; registry: SessionHandleRegistry }) {
  await runControlStep(input, async (controls) => controls.requestEnd(input.secondId, new Date()));
}

async function runControlStep(input: { setup: Awaited<ReturnType<typeof flowDevWorld>>["setup"]; registry: SessionHandleRegistry; cancel?: { pendingIds: (id: string) => Promise<string[]>; cancelAll: (id: string) => Promise<string[]> } }, request: (controls: DrizzleSessionControlDao) => Promise<unknown>) {
  const controls = new DrizzleSessionControlDao(input.setup.database);
  const status = new DrizzleSessionStatusDao(input.setup.database);
  const cancellation = input.cancel ?? { pendingIds: async () => [], cancelAll: async () => [] };
  await request(controls);
  await new SessionControlsStep({ registry: input.registry, hostId: HOST_ID, status, controls, messages: new DrizzleSessionMessageDao(input.setup.database), cancellation, flush: async () => undefined, captureEnd: async () => undefined, now: () => new Date(), log: { info: () => undefined, error: () => undefined } }).run();
}
