import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions } from "../src/infra/database/schema";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { closeTaskFixture } from "./task-api-support";
import { FakePlanningGateway, keepSessionAlive, movableClock, plannerFor, validEnvelope } from "./planning-provider-fixture";
import { addPublishedTask, currentTask, planningBase, planningCaller, publishedTask, readPlanning, startPlanning } from "./planning-support";

beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

const failing = (error: () => TaskError) => () => { throw error(); };

describe("planning worker isolation and failure shapes", () => {
  it("IT-069 attaches each decision only to its own publication and operation", async () => {
    const setup = await publishedTask();
    const other = await addPublishedTask(setup, { title: "Segundo" });
    const gateway = new FakePlanningGateway(async (input) => {
      const { title } = input.publication;
      if (title === "Título") await new Promise((resolve) => setTimeout(resolve, 150));
      return validEnvelope(input, `Resumo de ${title}`);
    });
    const [first, second] = [await startPlanning(setup), await startPlanning(setup, other, 3)];
    await Promise.all([plannerFor(setup, gateway).worker.tick(), plannerFor(setup, gateway).worker.tick()]);
    const rows = await setup.database.select().from(taskPlanningDecisions);
    const byTask = new Map(rows.map((row) => [row.taskId, row]));
    expect(byTask.get(setup.taskId)).toMatchObject({ summary: "Resumo de Título", operationId: first.operationId });
    expect(byTask.get(other)).toMatchObject({ summary: "Resumo de Segundo", operationId: second.operationId });
  });

  it("IT-088 keeps snapshots and credentials out of worker logs", async () => {
    const setup = await publishedTask("created", 7, "SNAPSHOT-SENTINEL corpo");
    const gateway = new FakePlanningGateway(failing(() => new TaskError("planning_local_agent_unavailable", undefined, new Error("KEY-SENTINEL provider text SNAPSHOT-SENTINEL"))));
    await startPlanning(setup);
    await plannerFor(setup, gateway).worker.tick();
    const output = [...(console.info as ReturnType<typeof vi.fn>).mock.calls, ...(console.error as ReturnType<typeof vi.fn>).mock.calls].flat().join("\n");
    expect(output).toContain("planning.failed");
    expect(output).not.toMatch(/SNAPSHOT-SENTINEL|KEY-SENTINEL/);
  });

  it("IT-090 maps repeated agent timeouts to the terminal timeout reason", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    await startPlanning(setup);
    const clock = movableClock();
    const { worker } = plannerFor(setup, new FakePlanningGateway(failing(() => new TaskError("planning_timeout"))), { clock: clock.now });
    for (let attempt = 0; attempt < 3; attempt += 1) { await worker.tick(); clock.advance(20_000); }
    expect((await readPlanning(setup)).operation).toMatchObject({ state: "failed", reason: "planning_timeout" });
  });

  it("IT-090 maps repeated usage limits to the rate limit reason and keeps the provider as detail", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const { AgentRunError } = await import("../src/application/agents/localAgentRunner");
    const limited = () => new TaskError("planning_rate_limited", undefined, new AgentRunError("usage_limit", "Codex"), 5);
    await startPlanning(setup);
    const clock = movableClock();
    const { worker } = plannerFor(setup, new FakePlanningGateway(failing(limited)), { clock: clock.now });
    for (let attempt = 0; attempt < 3; attempt += 1) { await worker.tick(); clock.advance(10_000); }
    expect((await readPlanning(setup)).operation).toMatchObject({ state: "failed", reason: "planning_rate_limited", detail: "Codex" });
  });

  it("IT-091 recovers one failed item without touching another", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const other = await addPublishedTask(setup);
    const [first, second] = [await startPlanning(setup), await startPlanning(setup, other, 3)];
    const { worker } = plannerFor(setup, new FakePlanningGateway(failing(() => new TaskError("planning_invalid_output"))));
    await worker.tick();
    await worker.tick();
    const untouched = await readPlanning(setup, other);
    expect(untouched).toMatchObject({ status: "failed", operation: { id: second.operationId, reason: "planning_invalid_output" } });
    const version = (await currentTask(setup)).version;
    await planningCaller(setup).planning.retry({ ...planningBase(setup, version), failedOperationId: first.operationId! });
    await plannerFor(setup, new FakePlanningGateway()).worker.tick();
    expect(await readPlanning(setup)).toMatchObject({ status: "review" });
    expect(await readPlanning(setup, other)).toEqual(untouched);
    expect(await setup.database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, other))).toHaveLength(0);
  });
});
