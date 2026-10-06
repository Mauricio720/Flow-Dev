import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleIssueContextDao } from "../src/infra/database/dao/tasks/drizzleIssueContextDao";
import { hashCapability } from "../src/infra/database/dao/tasks/taskOperationClaim";
import { closeTaskFixture } from "./task-api-support";
import { keepSessionAlive, movableClock, plannerFor } from "./planning-provider-fixture";
import { publishedTask, startPlanning } from "./planning-support";

beforeEach(() => vi.spyOn(console, "info").mockImplementation(() => {}));
afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

async function claimedPlanning() {
  const setup = await publishedTask();
  await keepSessionAlive(setup);
  await startPlanning(setup);
  const clock = movableClock();
  const { dao } = plannerFor(setup, undefined, { clock: clock.now });
  return { setup, clock, dao, claim: (await dao.claim("w1"))!, context: new DrizzleIssueContextDao(setup.database) };
}

describe("planning context capability", () => {
  it("lets the broker resolve a running planning execution to its own task and repository", async () => {
    const { setup, clock, claim, context } = await claimedPlanning();
    const execution = await context.execution(claim.executionId, hashCapability(claim.contextCapability), clock.now());
    expect(execution).toMatchObject({ taskId: setup.taskId, operationId: claim.operationId, fence: claim.fence, repositoryId: claim.repositoryId, repositoryNodeId: claim.repositoryNodeId });
  });

  it("refuses another capability and an expired one, and keeps it alive through heartbeats", async () => {
    const { clock, dao, claim, context } = await claimedPlanning();
    const tokenHash = hashCapability(claim.contextCapability);
    expect(await context.execution(claim.executionId, hashCapability("another-capability"), clock.now())).toBeNull();
    clock.advance(45_000);
    await dao.heartbeat(claim);
    clock.advance(45_000);
    expect(await context.execution(claim.executionId, tokenHash, clock.now())).not.toBeNull();
    clock.advance(61_000);
    expect(await context.execution(claim.executionId, tokenHash, clock.now())).toBeNull();
  });

  it("stops authorizing reads once the planning operation is settled or reclaimed", async () => {
    const settled = await claimedPlanning();
    await settled.dao.fail({ claim: settled.claim, reason: "planning_invalid_output" });
    expect(await settled.context.execution(settled.claim.executionId, hashCapability(settled.claim.contextCapability), settled.clock.now())).toBeNull();
    await closeTaskFixture();
    const reclaimed = await claimedPlanning();
    reclaimed.clock.advance(61_000);
    const next = (await reclaimed.dao.claim("w2"))!;
    expect(await reclaimed.context.execution(reclaimed.claim.executionId, hashCapability(reclaimed.claim.contextCapability), reclaimed.clock.now())).toBeNull();
    expect(await reclaimed.context.execution(next.executionId, hashCapability(next.contextCapability), reclaimed.clock.now())).not.toBeNull();
  });
});
