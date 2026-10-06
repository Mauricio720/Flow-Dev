import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { sessions, taskSpecAttempts } from "../src/infra/database/schema";
import { DrizzleTaskSpecDao } from "../src/infra/database/dao/spec/drizzleTaskSpecDao";
import { SpecLifecycleService } from "../src/application/services/spec/specLifecycleService";
import { closeTaskFixture } from "./task-api-support";
import { specCaller, specScope, specTask, startInput } from "./spec-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

function fakeRuntime() {
  const prompts = new Map<string, string>();
  return { prompts, send: (attempt: { promptIdempotencyKey: string; promptMessageId: string }) => prompts.set(attempt.promptIdempotencyKey, attempt.promptMessageId) };
}

describe("spec restart safety", () => {
  it("IT-200 replays the same command and one logical prompt after a worker restart", async () => {
    const setup = await specTask();
    const input = startInput(setup);
    const first = await specCaller(setup).start(input);
    const runtime = fakeRuntime();
    const dispatchOnce = async () => {
      const service = new SpecLifecycleService(new DrizzleTaskSpecDao(setup.database));
      const decision = await service.authorizeDispatch(first.attemptId!, async () => true);
      runtime.send(decision.attempt);
    };
    await dispatchOnce();
    await dispatchOnce();
    expect(runtime.prompts.size).toBe(1);
    const [row] = await setup.database.select().from(taskSpecAttempts);
    expect([...runtime.prompts]).toEqual([[row!.promptIdempotencyKey, row!.promptMessageId]]);
    expect(await specCaller(setup).start(input)).toEqual(first);
  });

  it("IT-233 records access_revoked without invoking the runtime when authorization changed before dispatch", async () => {
    const setup = await specTask();
    const receipt = await specCaller(setup).start(startInput(setup));
    const runtime = fakeRuntime();
    const service = new SpecLifecycleService(new DrizzleTaskSpecDao(setup.database));
    const decision = await service.authorizeDispatch(receipt.attemptId!, async () => false);
    if (decision.dispatch) runtime.send(decision.attempt);
    expect(decision).toMatchObject({ dispatch: false, reason: "access_revoked" });
    expect(runtime.prompts.size).toBe(0);
    const [row] = await setup.database.select().from(taskSpecAttempts);
    expect(row).toMatchObject({ state: "failed", terminalReason: "access_revoked" });
    expect((await specCaller(setup).byTask(specScope(setup))).state).toBe("failed");
  });

  it("IT-234 keeps queued work when only the browser session expired and entitlement is still valid", async () => {
    const setup = await specTask();
    const receipt = await specCaller(setup).start(startInput(setup));
    await setup.database.delete(sessions).where(eq(sessions.id, setup.sessionId));
    const service = new SpecLifecycleService(new DrizzleTaskSpecDao(setup.database));
    const entitled = async (attempt: { projectId: string; authorUserId: string }) => setup.repositoryAccess.requirePersonalRead({ userId: attempt.authorUserId }, attempt.projectId).then(() => true, () => false);
    const decision = await service.authorizeDispatch(receipt.attemptId!, entitled);
    expect(decision).toMatchObject({ dispatch: true, reason: null });
    const [row] = await setup.database.select().from(taskSpecAttempts);
    expect(row?.state).toBe("queued");
  });
});
