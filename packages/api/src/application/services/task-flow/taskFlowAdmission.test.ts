import { describe, expect, it, vi } from "vitest";
import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import { TaskFlowAdmission } from "./taskFlowAdmission";

describe("TaskFlowAdmission capacity", () => {
  it("UT-167 blocks a local admission at the configured global active-run limit", async () => {
    const plan = { id: "plan-1", taskId: "task-1", revision: 1, status: "ready", createdBy: "operator-1", updatedAt: new Date(), actions: [{ id: "action-1", position: 1, kind: "create_spec", state: "planned", loopName: null, loopVersion: null, inputs: {}, workspace: { kind: "local", target: { machineId: "machine-1", linkId: "link-1", linkRevision: 1, checkoutHandle: "opaque" } }, bindings: [] }] };
    const insert = vi.fn();
    const lockAdmission = vi.fn();
    const dao = {
      lockTask: vi.fn(),
      plans: { lock: vi.fn(async () => plan) },
      runs: { findByKey: vi.fn(async () => null), activeWrite: vi.fn(async () => null), lockAdmission, countActiveTotal: vi.fn(async () => 1), insert },
    } as unknown as TaskFlowDao;
    const admission = new TaskFlowAdmission({
      validator: {} as never,
      gateway: {} as never,
      readiness: {} as never,
      gate: { eligibility: async () => ({ canPlan: true, reason: null }), approvedSpec: async () => true, approvedTasks: async () => true },
      workspaces: { resolve: vi.fn() } as never,
      capacity: { maxActiveActions: async () => 1 },
    });

    await expect(admission.start(dao, { taskId: "task-1", projectId: "project-1", actorId: "operator-1" }, { actionId: "action-1", expectedRevision: 1, idempotencyKey: "request-1" })).rejects.toMatchObject({ reason: "capacity_reached" });
    expect(lockAdmission).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
  });
});
