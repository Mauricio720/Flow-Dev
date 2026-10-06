import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taskSpecCommands, taskSpecEvents, taskSpecInteractions } from "../src/infra/database/schema";
import { SpecRuntimeError } from "../src/infra/spec/compozy/compozyErrors";
import { closeTaskFixture } from "./task-api-support";
import { specTask } from "./spec-support";
import { attemptRow, fakeDeps, NOW, setAttempt } from "./spec-worker-support";
import { seedQuestion, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

const bound = { runtimeWorkspaceId: "w1", runtimeSessionId: "s1", runtimeTurnId: "t1" };
const snapshot = (overrides: Record<string, unknown>) => ({ state: "stopping", verified: false, stopReason: null, stopCause: null, turnId: null, attention: null, pendingInteractions: [], ...overrides });

async function stopping(requestedSecondsAgo: number) {
  const setup = await specTask();
  await startWorkflow(setup);
  await setAttempt(setup, { state: "stopping", stopRequestedAt: new Date(NOW.getTime() - requestedSecondsAgo * 1000), ...bound });
  return setup;
}

describe("stop supervision", () => {
  it("IT-103 stays stopping with an attention warning after 61 unverified seconds", async () => {
    const setup = await stopping(61);
    const { controller, runtime } = fakeDeps(setup);
    runtime.inspect.mockResolvedValue(snapshot({}) as never);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "stopping", attention: "stop_unverified" });
  });
  it("IT-211 keeps a young unverified stop without attention", async () => {
    const setup = await stopping(5);
    const { controller, runtime } = fakeDeps(setup);
    runtime.inspect.mockResolvedValue(snapshot({}) as never);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "stopping", attention: null });
  });
  it("IT-106 and IT-213 retain outcome_unknown when the daemon connection drops after an accepted stop", async () => {
    const setup = await stopping(10);
    const { controller, runtime } = fakeDeps(setup);
    runtime.inspect.mockImplementation(async () => { throw new SpecRuntimeError("outcome_unknown", true); });
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "reconciling", terminalReason: "outcome_unknown" });
  });
  it("IT-212 commits one canceled terminal event after a verified user cancellation", async () => {
    const setup = await stopping(10);
    const { controller, runtime } = fakeDeps(setup);
    runtime.inspect.mockResolvedValue(snapshot({ state: "stopped", verified: true, stopReason: "user_canceled" }) as never);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "canceled", leaseOwner: null });
    expect((await setup.database.select().from(taskSpecEvents)).map((event) => event.kind)).toEqual(["attempt.canceled"]);
  });
  it("settles a stop requested before any runtime session as canceled without runtime calls", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    await setAttempt(setup, { state: "stopping", stopRequestedAt: NOW });
    const { controller, runtime } = fakeDeps(setup);
    await controller.tick();
    expect(runtime.stop).not.toHaveBeenCalled();
    expect((await attemptRow(setup)).state).toBe("canceled");
  });
});

describe("entitlement supervision", () => {
  it("IT-149 requests a system stop when the author loses access and never answers the pending question", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    await setAttempt(setup, { state: "waiting", ...bound });
    await seedQuestion(setup, started);
    const { controller, access, runtime } = fakeDeps(setup);
    access.check.mockResolvedValue("revoked" as never);
    await controller.tick();
    expect(runtime.stop).toHaveBeenCalledTimes(1);
    expect(runtime.resolve).not.toHaveBeenCalled();
    expect(await attemptRow(setup)).toMatchObject({ state: "stopping", terminalReason: "access_revoked" });
    const [question] = await setup.database.select().from(taskSpecInteractions);
    expect(question).toMatchObject({ status: "pending", winningCommandId: null, response: null });
    expect((await setup.database.select().from(taskSpecCommands)).every((command) => command.action === "spec.start")).toBe(true);
  });
  it("suspends side effects without revoking when the access check is inconclusive", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { controller, access, runtime, workspaces } = fakeDeps(setup);
    access.check.mockResolvedValue("unknown" as never);
    await controller.tick();
    expect(workspaces.prepare).not.toHaveBeenCalled();
    expect(runtime.create).not.toHaveBeenCalled();
    expect((await attemptRow(setup)).state).toBe("dispatching");
  });
  it("finishes a revoked stop as failed with access_revoked once the runtime verifies it", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    await setAttempt(setup, { state: "stopping", terminalReason: "access_revoked", stopRequestedAt: NOW, ...bound });
    const { controller, runtime } = fakeDeps(setup);
    runtime.inspect.mockResolvedValue(snapshot({ state: "stopped", verified: true, stopReason: "user_canceled" }) as never);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "failed", terminalReason: "access_revoked" });
  });
});
