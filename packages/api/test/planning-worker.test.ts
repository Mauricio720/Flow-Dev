import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleWorkerOperationDao } from "../src/infra/database/dao/tasks/drizzleTaskOperationDao";
import { DrizzleTaskPublicationWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao";
import { sessions, taskOperations, taskPlanningDecisions, tasks } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { ASSESSMENT, FakePlanningGateway, keepSessionAlive, movableClock, plannerFor, validEnvelope } from "./planning-provider-fixture";
import { currentTask, planningBase, planningCaller, publishedTask, readPlanning, startPlanning } from "./planning-support";

beforeEach(() => vi.spyOn(console, "info").mockImplementation(() => {}));
afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

const failing = (reason: ConstructorParameters<typeof TaskError>[0]) => () => { throw new TaskError(reason); };

const decisions = (setup: Awaited<ReturnType<typeof publishedTask>>) => setup.database.select().from(taskPlanningDecisions);
const planOperation = async (setup: Awaited<ReturnType<typeof publishedTask>>) => (await setup.database.select().from(taskOperations).where(eq(taskOperations.kind, "plan")))[0]!;

describe("planning worker", () => {
  it("IT-003 and IT-070 save one review from a snapshot-only analysis request", async () => {
    const setup = await publishedTask();
    const gateway = new FakePlanningGateway();
    const receipt = await startPlanning(setup);
    expect(await plannerFor(setup, gateway).worker.tick()).toBe(true);
    const planning = await readPlanning(setup);
    expect(planning).toMatchObject({ status: "review", decision: { recommendedRoute: "tech_spec", selectedRoute: "tech_spec", decisionSource: "AI" } });
    expect(await decisions(setup)).toHaveLength(1);
    const [input] = gateway.calls;
    expect(input).toMatchObject({ operationId: receipt.operationId, issueUrl: "https://github.com/acme/private/issues/41", publication: { issueNumber: 41 } });
    expect(Object.keys(input!).sort()).toEqual(["contextCapability", "executionId", "images", "inputHash", "issueUrl", "omittedImages", "operationId", "protocolVersion", "publication", "taskId"]);
    expect(input!.contextCapability.length).toBeGreaterThanOrEqual(32);
    expect(JSON.stringify(input!.publication)).not.toMatch(/session|token|capability/i);
  });

  it("IT-021 gives one claim to concurrent workers with fence 1 and a 60 second lease", async () => {
    const setup = await publishedTask();
    await startPlanning(setup);
    const [first, second] = await Promise.all([plannerFor(setup, undefined).dao.claim("w1"), plannerFor(setup, undefined).dao.claim("w2")]);
    const claims = [first, second].filter(Boolean);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ fence: 1, attempts: 1 });
    expect(claims[0]!.leaseUntil.getTime() - Date.now()).toBeGreaterThan(55_000);
  });

  it("IT-023 and IT-080 reject settlement from a superseded or expired fence", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    await startPlanning(setup);
    const clock = movableClock();
    const { dao } = plannerFor(setup, undefined, { clock: clock.now });
    const stale = (await dao.claim("w1"))!;
    const envelope = { protocolVersion: 1 as const, operationId: stale.operationId, executionId: stale.executionId, taskId: stale.taskId, inputHash: "h", result: ASSESSMENT as never };
    clock.advance(61_000);
    await expect(dao.complete({ claim: stale, envelope })).rejects.toMatchObject({ reason: "stale_execution" });
    const current = (await dao.claim("w2"))!;
    expect(current.fence).toBe(2);
    await expect(dao.complete({ claim: stale, envelope })).rejects.toMatchObject({ reason: "stale_execution" });
    expect(await decisions(setup)).toHaveLength(0);
    expect((await planOperation(setup)).executionId).toBe(current.executionId);
  });

  it("IT-024 retries transient failures after the bounded waits and saves one review", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const gateway = new FakePlanningGateway((input, index) => { if (index < 2) throw new TaskError("planning_provider_unavailable"); return validEnvelope(input); });
    await startPlanning(setup);
    const clock = movableClock();
    const { worker } = plannerFor(setup, gateway, { clock: clock.now });
    await worker.tick();
    expect(await worker.tick()).toBe(false);
    clock.advance(6_000);
    await worker.tick();
    clock.advance(16_000);
    await worker.tick();
    expect(gateway.calls).toHaveLength(3);
    expect(new Set(gateway.calls.map((call) => call.operationId)).size).toBe(1);
    expect((await readPlanning(setup)).status).toBe("review");
    expect(await decisions(setup)).toHaveLength(1);
  });

  it("IT-025 stops after three transient failures without a decision", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const gateway = new FakePlanningGateway(failing("planning_provider_unavailable"));
    await startPlanning(setup);
    const clock = movableClock();
    const { worker } = plannerFor(setup, gateway, { clock: clock.now });
    for (let attempt = 0; attempt < 3; attempt += 1) { await worker.tick(); clock.advance(20_000); }
    expect(await readPlanning(setup)).toMatchObject({ status: "failed", operation: { state: "failed", reason: "planning_provider_unavailable" }, decision: null });
    expect((await currentTask(setup)).activeOperationId).toBeNull();
    expect(gateway.calls).toHaveLength(3);
  });

  it("IT-026 fails queued work past the 15 minute deadline on the next sweep", async () => {
    const setup = await publishedTask();
    const gateway = new FakePlanningGateway();
    await startPlanning(setup);
    await setup.database.update(taskOperations).set({ createdAt: new Date(Date.now() - 900_000) }).where(eq(taskOperations.kind, "plan"));
    await plannerFor(setup, gateway).worker.tick();
    expect(await readPlanning(setup)).toMatchObject({ status: "failed", operation: { reason: "planning_deadline" } });
    expect(gateway.calls).toHaveLength(0);
  });

  it("IT-027 replays the operation after a failed settlement and stores one decision", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const gateway = new FakePlanningGateway();
    await startPlanning(setup);
    await setup.database.execute(`CREATE FUNCTION fail_decision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'disconnect'; END; $$` as never);
    await setup.database.execute(`CREATE TRIGGER fail_decision BEFORE INSERT ON task_planning_decisions FOR EACH ROW EXECUTE FUNCTION fail_decision()` as never);
    const clock = movableClock();
    const { worker } = plannerFor(setup, gateway, { clock: clock.now });
    await worker.tick();
    expect(await decisions(setup)).toHaveLength(0);
    expect((await planOperation(setup)).state).toBe("running");
    await setup.database.execute(`DROP TRIGGER fail_decision ON task_planning_decisions` as never);
    clock.advance(61_000);
    await worker.tick();
    expect(await decisions(setup)).toHaveLength(1);
    expect(new Set(gateway.calls.map((call) => call.operationId)).size).toBe(1);
  });

  it("IT-028 and IT-029 save safe failures for invalid or mismatched output", async () => {
    for (const reason of ["planning_invalid_output", "planning_execution_mismatch"] as const) {
      const setup = await publishedTask();
      await startPlanning(setup);
      await plannerFor(setup, new FakePlanningGateway(failing(reason))).worker.tick();
      expect(await readPlanning(setup)).toMatchObject({ status: "failed", operation: { reason }, decision: null });
      expect(await decisions(setup)).toHaveLength(0);
      await closeTaskFixture();
    }
  });

  it("IT-030 fails without calling the agent when the session or access is revoked", async () => {
    const setup = await publishedTask();
    const gateway = new FakePlanningGateway();
    await startPlanning(setup);
    await setup.database.delete(sessions).where(eq(sessions.id, setup.sessionId));
    await plannerFor(setup, gateway).worker.tick();
    expect(await readPlanning(setup)).toMatchObject({ status: "failed", operation: { reason: "planning_access_revoked" } });
    expect(gateway.calls).toHaveLength(0);
  });

  it("IT-031 keeps a valid current result when the session expires during analysis", async () => {
    const setup = await publishedTask();
    const gateway = new FakePlanningGateway(async (input) => { await setup.database.delete(sessions).where(eq(sessions.id, setup.sessionId)); return validEnvelope(input); });
    await startPlanning(setup);
    await plannerFor(setup, gateway).worker.tick();
    expect(await decisions(setup)).toHaveLength(1);
    expect((await currentTask(setup)).planningStatus).toBe("review");
  });

  it("IT-032 keeps generation and publication claims away from plan operations", async () => {
    const setup = await publishedTask();
    await startPlanning(setup);
    expect(await new DrizzleWorkerOperationDao(setup.database).claim("generator")).toBeNull();
    expect(await new DrizzleTaskPublicationWorkerDao(setup.database).claim("publisher")).toBeNull();
    expect((await planOperation(setup)).state).toBe("queued");
  });

  it("IT-081 ignores a delayed failure from an obsolete operation", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    const receipt = await startPlanning(setup);
    const { dao } = plannerFor(setup, undefined);
    const first = (await dao.claim("w"))!;
    await dao.fail({ claim: first, reason: "planning_provider_unavailable" });
    const retried = await planningCaller(setup).planning.retry({ ...planningBase(setup, (await currentTask(setup)).version), failedOperationId: receipt.operationId! });
    const second = (await dao.claim("w"))!;
    await dao.complete({ claim: second, envelope: { protocolVersion: 1, operationId: second.operationId, executionId: second.executionId, taskId: second.taskId, inputHash: "h", result: ASSESSMENT as never } });
    await expect(dao.fail({ claim: first, reason: "planning_timeout" })).rejects.toMatchObject({ reason: "stale_execution" });
    expect(await readPlanning(setup)).toMatchObject({ status: "review", operation: { id: retried.operationId, reason: null } });
  });
});
