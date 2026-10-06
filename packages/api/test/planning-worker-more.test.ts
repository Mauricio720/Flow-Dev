import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { DECISION, keepSessionAlive, movableClock, plannerFor, providerFixture, respondStatus, respondValid } from "./planning-provider-fixture";
import { addPublishedTask, currentTask, planningBase, planningCaller, publishedTask, readPlanning, startPlanning } from "./planning-support";

let closeProvider: (() => Promise<void>) | undefined;
beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await closeProvider?.(); closeProvider = undefined; await closeTaskFixture(); });

async function withProvider(handler?: Parameters<typeof providerFixture>[0]) {
  const provider = await providerFixture(handler);
  closeProvider = provider.close;
  return provider;
}

describe("planning worker isolation and failure shapes", () => {
  it("IT-069 attaches each decision only to its own publication and operation", async () => {
    const setup = await publishedTask();
    const other = await addPublishedTask(setup, { title: "Segundo" });
    const provider = await withProvider(async (request, response) => {
      const title = (request.body.issue as { title: string }).title;
      if (title === "Título") await new Promise((resolve) => setTimeout(resolve, 150));
      respondValid(request, response, { result: { ...DECISION, summary: `Resumo de ${title}` } });
    });
    const [first, second] = [await startPlanning(setup), await startPlanning(setup, other, 3)];
    await Promise.all([plannerFor(setup, provider.url).worker.tick(), plannerFor(setup, provider.url).worker.tick()]);
    const rows = await setup.database.select().from(taskPlanningDecisions);
    const byTask = new Map(rows.map((row) => [row.taskId, row]));
    expect(byTask.get(setup.taskId)).toMatchObject({ summary: "Resumo de Título", operationId: first.operationId });
    expect(byTask.get(other)).toMatchObject({ summary: "Resumo de Segundo", operationId: second.operationId });
  });

  it("IT-088 keeps snapshots and credentials out of worker logs", async () => {
    const setup = await publishedTask("created", 7, "SNAPSHOT-SENTINEL corpo");
    const provider = await withProvider(respondStatus(401, {}, "KEY-SENTINEL provider text SNAPSHOT-SENTINEL"));
    await startPlanning(setup);
    await plannerFor(setup, provider.url).worker.tick();
    const output = [...(console.info as ReturnType<typeof vi.fn>).mock.calls, ...(console.error as ReturnType<typeof vi.fn>).mock.calls].flat().join("\n");
    expect(output).toContain("planning.failed");
    expect(output).not.toMatch(/SNAPSHOT-SENTINEL|KEY-SENTINEL|service-key-sentinel/);
  });

  it("IT-090 maps oversized output to its terminal safe reason", async () => {
    const setup = await publishedTask();
    const provider = await withProvider((_request, response) => { response.writeHead(200); response.end(" ".repeat(256 * 1024 + 1)); });
    await startPlanning(setup);
    await plannerFor(setup, provider.url).worker.tick();
    expect(await readPlanning(setup)).toMatchObject({ status: "failed", operation: { reason: "planning_invalid_output" } });
  });

  it("IT-090 maps an absolute HTTP timeout and repeated 429 to terminal reasons", async () => {
    const hanging = await publishedTask();
    const provider = await withProvider(() => new Promise(() => {}));
    await startPlanning(hanging);
    const clock = movableClock();
    const { worker } = plannerFor(hanging, provider.url, { clock: clock.now, timeoutMs: 100 });
    await keepSessionAlive(hanging);
    for (let attempt = 0; attempt < 3; attempt += 1) { await worker.tick(); clock.advance(20_000); }
    expect((await readPlanning(hanging)).operation).toMatchObject({ state: "failed", reason: "planning_timeout" });
  });

  it("IT-090 maps repeated 429 to the rate limit reason", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const provider = await withProvider(respondStatus(429, { "retry-after": "5" }));
    await startPlanning(setup);
    const clock = movableClock();
    const { worker } = plannerFor(setup, provider.url, { clock: clock.now });
    for (let attempt = 0; attempt < 3; attempt += 1) { await worker.tick(); clock.advance(10_000); }
    expect((await readPlanning(setup)).operation).toMatchObject({ state: "failed", reason: "planning_rate_limited" });
  });

  it("IT-091 recovers one failed item without touching another", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const other = await addPublishedTask(setup);
    const failing = await withProvider(respondStatus(422));
    const [first, second] = [await startPlanning(setup), await startPlanning(setup, other, 3)];
    const { worker } = plannerFor(setup, failing.url);
    await worker.tick();
    await worker.tick();
    const untouched = await readPlanning(setup, other);
    expect(untouched).toMatchObject({ status: "failed", operation: { id: second.operationId, reason: "planning_invalid_output" } });
    const version = (await currentTask(setup)).version;
    await planningCaller(setup).planning.retry({ ...planningBase(setup, version), failedOperationId: first.operationId! });
    await failing.close();
    const working = await providerFixture();
    closeProvider = working.close;
    await plannerFor(setup, working.url).worker.tick();
    expect(await readPlanning(setup)).toMatchObject({ status: "review" });
    expect(await readPlanning(setup, other)).toEqual(untouched);
    expect(await setup.database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, other))).toHaveLength(0);
  });
});
