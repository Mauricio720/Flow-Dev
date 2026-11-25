import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifactVersions, taskTerminalEvents, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { workerWorld, sendMessage } from "./session-worker-support";
import { LOAD_QUESTION, UI_POLL_INTERVAL_MS, observeRuntime, observeTimeline, percentile95, type RuntimeTimes } from "./session-latency-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const COUNT = 20;
const ARTIFACT = "docs/specs/load/spec.md";
const scope = (world: Awaited<ReturnType<typeof workerWorld>>, sessionId: string) => ({ projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId });

async function waitUntil(check: () => Promise<boolean> | boolean) {
  await vi.waitFor(async () => expect(await check()).toBe(true), { timeout: 14_000, interval: 5 });
}

async function startLoad(times: RuntimeTimes) {
  const world = await workerWorld({ script: [{ kind: "wait_message" }, { kind: "text", text: "resposta da carga" }, { kind: "ask", questions: LOAD_QUESTION }] }, { permissions: undefined });
  observeRuntime(world, times);
  const ids = await Promise.all(Array.from({ length: COUNT + 1 }, () => world.open({ allowAdditional: true })));
  const abort = new AbortController();
  const running = world.worker.run(abort.signal);
  await waitUntil(() => world.runtime.starts.length === ids.length);
  return { world, ids, abort, running };
}

async function seedCapture(world: Awaited<ReturnType<typeof workerWorld>>, sessionId: string) {
  await mkdir(dirname(join(world.clone, ARTIFACT)), { recursive: true });
  await writeFile(join(world.clone, ARTIFACT), "# concorrência e captura\n");
  await world.setup.database.insert(taskTerminalEvents).values({ sessionId, kind: "file_edit", summary: "Editou spec", path: ARTIFACT, skill: "spec-writer" });
  await world.setup.database.update(taskTerminalSessions).set({ activeSkill: "spec-writer" }).where(eq(taskTerminalSessions.id, sessionId));
}

async function deliverLoad(world: Awaited<ReturnType<typeof workerWorld>>, ids: string[]) {
  const sentAt = new Map<string, number>();
  await Promise.all(ids.slice(0, COUNT).map(async (sessionId, index) => {
    sentAt.set(sessionId, performance.now());
    await sendMessage(world, sessionId, `mensagem-${index}`);
  }));
  await waitUntil(() => ids.slice(0, COUNT).every((id, index) => world.runtime.runnerOf(id).received.includes(`mensagem-${index}`)));
  return ids.slice(0, COUNT).map((id) => performance.now() - sentAt.get(id)!);
}

type Observation = Awaited<ReturnType<typeof observeTimeline>>;

async function answerRequests(world: Awaited<ReturnType<typeof workerWorld>>, ids: string[], paths: Observation[]) {
  const answeredAt = new Map<string, number>();
  await Promise.all(paths.map(async (path, index) => {
    const id = ids[index]!;
    const answerScope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    await world.harness.caller.session.answerQuestion({ ...answerScope, requestId: path.requestId, answers: { [LOAD_QUESTION[0]!.question]: { labels: ["Sim"] } } });
    answeredAt.set(id, performance.now());
  }));
  await waitUntil(() => ids.slice(0, COUNT).every((id) => world.runtime.runnerOf(id).outcomes.length === 1));
  return ids.slice(0, COUNT).map((id) => performance.now() - answeredAt.get(id)!);
}

function reportOf(inputMs: number[], paths: Observation[], responseMs: number[]) {
  const messagePersistMs = paths.map((path) => path.messagePersistedAt - path.textEmittedAt);
  const textPollMs = paths.map((path) => path.textObservedAt - path.textEmittedAt);
  const requestPersistMs = paths.map((path) => path.requestPersistedAt - path.requestEmittedAt);
  const requestPollMs = paths.map((path) => path.requestObservedAt - path.requestEmittedAt);
  return { sessions: COUNT + 1, samplesPerPath: COUNT, uiPollIntervalMs: UI_POLL_INTERVAL_MS, inputP95Ms: Math.round(percentile95(inputMs)), textEmissionToPersistenceObservedP95Ms: Math.round(percentile95(messagePersistMs)), textEmissionToFirstTimelinePollP95Ms: Math.round(percentile95(textPollMs)), questionEmissionToPersistenceObservedP95Ms: Math.round(percentile95(requestPersistMs)), questionEmissionToFirstTimelinePollP95Ms: Math.round(percentile95(requestPollMs)), answerPersistedToRuntimeResolutionP95Ms: Math.round(percentile95(responseMs)), inputMaxMs: Math.round(Math.max(...inputMs)), textPersistenceObservedMaxMs: Math.round(Math.max(...messagePersistMs)), textFirstPollMaxMs: Math.round(Math.max(...textPollMs)), questionPersistenceObservedMaxMs: Math.round(Math.max(...requestPersistMs)), questionFirstPollMaxMs: Math.round(Math.max(...requestPollMs)), answerResolutionMaxMs: Math.round(Math.max(...responseMs)) };
}

describe("session latency under concurrent load", () => {
  it("measures input, emitted output, database persistence, first timeline polling and answer resolution during capture", async () => {
    const times: RuntimeTimes = { text: new Map(), question: new Map() };
    const { world, ids, abort, running } = await startLoad(times);
    const observations = ids.slice(0, COUNT).map((id) => observeTimeline(world, id, times));
    await seedCapture(world, ids[COUNT]!);
    await world.harness.caller.session.end(scope(world, ids[COUNT]!));
    try {
      const inputMs = await deliverLoad(world, ids);
      const paths = await Promise.all(observations);
      const responseMs = await answerRequests(world, ids, paths);
      await waitUntil(async () => (await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, ids[COUNT]!))).at(0)?.status === "ended");
      await waitUntil(async () => (await world.setup.database.select().from(taskArtifactVersions)).length > 0);
      const report = reportOf(inputMs, paths, responseMs);
      console.info("SESSION_LATENCY_REPORT", JSON.stringify(report));
      expect(report.inputP95Ms).toBeLessThanOrEqual(2_000);
      expect(report.textEmissionToFirstTimelinePollP95Ms).toBeLessThanOrEqual(3_000);
      expect(report.questionEmissionToFirstTimelinePollP95Ms).toBeLessThanOrEqual(3_000);
      expect(report.answerPersistedToRuntimeResolutionP95Ms).toBeLessThanOrEqual(2_000);
    } finally {
      abort.abort();
      await running;
    }
  }, 30_000);
});
