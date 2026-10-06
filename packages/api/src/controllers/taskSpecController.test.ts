import { describe, expect, it, vi } from "vitest";
import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import { SpecLifecycleService } from "../application/services/spec/specLifecycleService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { mapSpecError } from "./specErrorMapper";
import { TaskSpecController } from "./taskSpecController";

const scope = { projectId: "10000000-0000-4000-8000-000000000001", taskId: "20000000-0000-4000-8000-000000000001" };
const actor = { userId: "author-a", sessionId: "session" };
const receipt = { commandId: "c1", status: "accepted" as const, specVersion: 1, attemptId: "r1", packageId: null, reason: null };

function build(overrides: { requirePersonalRead?: () => Promise<unknown>; start?: () => Promise<unknown>; author?: string } = {}) {
  const tasks = { findScoped: vi.fn(async () => ({ authorUserId: overrides.author ?? actor.userId })) };
  const specs = { start: vi.fn(overrides.start ?? (async () => ({ ...receipt, replayed: false }))), hadAccess: vi.fn(async () => true) };
  const repositories = { requirePersonalRead: vi.fn(overrides.requirePersonalRead ?? (async () => ({}))) };
  const controller = new TaskSpecController(tasks as never, specs as never, new SpecLifecycleService(specs as never), repositories as never);
  return { controller, specs, repositories };
}

describe("TaskSpecController", () => {
  it("UT-003 dispatches one lifecycle call for the author with repository credentials", async () => {
    const { controller, specs, repositories } = build();
    const result = await controller.start(actor, { ...scope, requestKey: "k1", expectedSpecVersion: 0, stage: "prd" });
    expect(result).toEqual(receipt);
    expect(specs.start).toHaveBeenCalledTimes(1);
    expect(repositories.requirePersonalRead).toHaveBeenCalledWith(actor, scope.projectId);
  });

  it("UT-004 maps an unknown exception to service_unavailable without its message", () => {
    expect.assertions(3);
    try { mapSpecError(new Error("postgres://secret@host")); } catch (error) {
      expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", cause: { reason: "service_unavailable" } });
      expect(JSON.stringify((error as Error).message)).not.toContain("secret");
      expect(((error as Error).cause as Error).cause).toBeUndefined();
    }
  });

  it("does not call the lifecycle for a reader", async () => {
    const { controller, specs } = build({ author: "someone-else" });
    await expect(controller.start(actor, { ...scope, requestKey: "k1", expectedSpecVersion: 0, stage: "prd" })).rejects.toMatchObject({ reason: "author_required" });
    expect(specs.start).not.toHaveBeenCalled();
  });

  it("distinguishes revoked access from a hidden project", async () => {
    const { controller, specs } = build({ requirePersonalRead: async () => { throw new ProjectUnavailableError(); } });
    await expect(controller.byTask(actor, scope)).rejects.toMatchObject({ reason: "access_revoked" });
    specs.hadAccess.mockResolvedValue(false);
    await expect(controller.byTask(actor, scope)).rejects.toMatchObject({ reason: "spec_unavailable" });
  });

  it("keeps safe task errors intact", () => {
    expect(() => mapSpecError(new TaskError("spec_capacity", undefined, undefined, 30))).toThrow(expect.objectContaining({ code: "TOO_MANY_REQUESTS" }));
  });

  it("IT-143 excludes a token and a host path from a runtime failure response", () => {
    expect.assertions(2);
    try { mapSpecError(new Error("runtime failed token=canary-secret at /home/mauricio/.config/secret")); } catch (error) {
      const text = JSON.stringify({ message: (error as Error).message, cause: ((error as Error).cause as Error)?.message });
      expect(text).not.toContain("canary-secret");
      expect(text).not.toContain("/home/mauricio");
    }
  });
});
