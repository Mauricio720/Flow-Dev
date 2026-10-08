import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSpecCommands, taskSpecInteractions } from "../src/infra/database/schema";
import { permissionTargetDigest } from "../src/application/services/spec/specInteractionRules";
import { closeTaskFixture } from "./task-api-support";
import { httpProcedure } from "./spec-calls";
import { rejection, specCaller, specScope, specTask } from "./spec-support";
import { seedInteraction, setAttemptState, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

async function pending(options = {}) {
  const setup = await specTask();
  const started = await startWorkflow(setup);
  const permission = await seedInteraction(setup, started, { kind: "permission", ...options });
  const input = (decision: string, overrides: Record<string, unknown> = {}) => ({ ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: 1, attemptId: started.attemptId, interactionId: permission.id, actionDigest: permission.targetDigest ?? "a".repeat(64), decision, ...overrides });
  return { setup, started, permission, input, caller: specCaller(setup) };
}
const row = async (setup: Awaited<ReturnType<typeof pending>>["setup"]) => (await setup.database.select().from(taskSpecInteractions))[0]!;

describe("taskSpec.permission", () => {
  it("IT-161 accepts deny_once for the current digest and records it as pending delivery", async () => {
    const { setup, caller, input } = await pending();
    const receipt = await caller.permission(input("deny_once") as never);
    expect(receipt).toMatchObject({ status: "accepted" });
    expect(await row(setup)).toMatchObject({ status: "resolved", delivery: "pending", response: { decision: "deny_once" } });
  });

  it("IT-041 and IT-190 refuse a missing target, a missing digest and a mismatched digest", async () => {
    const blocked = await pending({ status: "blocked", target: null, description: "" });
    expect(await rejection(blocked.caller.permission(blocked.input("allow_once") as never))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_permission" });
    const { setup, caller, input } = await pending();
    expect(await rejection(caller.permission(input("allow_once", { actionDigest: "f".repeat(64) }) as never))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_permission" });
    expect(await httpProcedure(setup, "permission", input("allow_once", { actionDigest: undefined }))).toEqual({ status: 400, reason: "invalid_permission" });
    expect(await httpProcedure(setup, "permission", input("allow_always"))).toEqual({ status: 400, reason: "invalid_permission" });
    expect((await row(setup)).status).toBe("pending");
  });

  it("IT-191 maps an allow for git push to permission_out_of_scope and still lets the author deny it", async () => {
    const target = { tool: "bash", command: "git push origin main" };
    const { caller, input, setup } = await pending({ target, description: "git push origin main" });
    expect(await rejection(caller.permission(input("allow_once") as never))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "permission_out_of_scope" });
    expect((await row(setup)).status).toBe("pending");
    expect((await caller.permission(input("deny_once") as never)).status).toBe("accepted");
  });

  it("IT-044 refuses a reader and IT-048 hides foreign interactions", async () => {
    const { setup, input } = await pending();
    await setup.authorize(setup.readerId);
    expect(await rejection(specCaller(setup, setup.readerId).permission(input("allow_once") as never))).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
    expect(await rejection(specCaller(setup).permission(input("allow_once", { interactionId: crypto.randomUUID() }) as never))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
  });

  it("IT-045 saves one authoritative decision when allow and deny race", async () => {
    const { setup, caller, input } = await pending();
    const results = await Promise.allSettled([caller.permission(input("allow_once") as never), caller.permission(input("deny_once") as never)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const saved = await row(setup);
    expect(saved.status).toBe("resolved");
    expect(await setup.database.select().from(taskSpecCommands).where(eq(taskSpecCommands.action, "spec.permission"))).toHaveLength(1);
    expect(await rejection(caller.permission(input("deny_once", { expectedSpecVersion: 2 }) as never))).toMatchObject({ code: "CONFLICT", reason: "interaction_resolved" });
  });

  it("IT-049 reports a permission control for a stopping attempt as stale", async () => {
    const { setup, started, caller, input } = await pending();
    await setAttemptState(setup, started, "stopping");
    expect(await rejection(caller.permission(input("allow_once") as never))).toMatchObject({ code: "CONFLICT", reason: "interaction_stale" });
    expect((await row(setup)).status).toBe("pending");
  });

  it("IT-192 reports a permission from a stale turn of the same attempt as stale", async () => {
    const { setup, started, caller, input } = await pending();
    await setAttemptState(setup, started, "waiting", "turn-9");
    expect(await rejection(caller.permission(input("allow_once") as never))).toMatchObject({ code: "CONFLICT", reason: "interaction_stale" });
  });

  it("IT-047 gives a retry attempt a new unresolved permission instead of reusing a previous grant", async () => {
    const { setup, started, caller, input, permission } = await pending();
    await caller.permission(input("allow_once") as never);
    const other = { tool: "write", path: "_techspec.md" };
    const next = await seedInteraction(setup, started, { kind: "permission", target: other, description: "Escrever _techspec.md" });
    expect(next.targetDigest).toBe(permissionTargetDigest(other));
    expect(next.targetDigest).not.toBe(permission.targetDigest);
    expect(next).toMatchObject({ status: "pending", winningCommandId: null, response: null });
  });
});
