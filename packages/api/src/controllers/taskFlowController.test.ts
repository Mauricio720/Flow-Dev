import { describe, expect, it, vi } from "vitest";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import type { TaskFlowService } from "../application/services/task-flow/taskFlowService";
import { TaskFlowController } from "./taskFlowController";

const scope = { projectId: "p1", taskId: "t1" };
const source = { snapshot: { id: "s1", contentHash: "current" } };
const actor = { userId: "u1" };

function build(reason: string | null, contentHash = "current") {
  const authorization = {
    requireRead: vi.fn(async () => source),
    assess: vi.fn(async () => ({ source, claim: null, reason, contentHash })),
    requireOperate: vi.fn(async () => ({ ...scope, actorId: actor.userId, sourceSnapshotId: "s1", claimRevision: 4 })),
  };
  const service = {
    options: vi.fn(async () => ({ taskId: "t1", planningAvailable: true })),
    flowKind: vi.fn(async () => "unified"),
    gates: vi.fn(async (): Promise<Awaited<ReturnType<TaskFlowService["gates"]>>> => ({ items: [], summary: "unrun", nextCursor: null })),
    evidence: vi.fn(async (): Promise<Awaited<ReturnType<TaskFlowService["evidence"]>>> => ({ id: "e1", kind: "test-summary", safeContentHash: "a".repeat(64), label: "test-summary", content: "passed" })),
  };
  return { controller: new TaskFlowController(authorization as unknown as WorkAuthorization, service as unknown as TaskFlowService), authorization, service };
}

describe("TaskFlowController operator capabilities", () => {
  it("UT-155 exposes options only for the current claimed operator", async () => {
    const operator = build(null);
    expect(await operator.controller.options(actor, scope)).toMatchObject({ viewerCanOperate: true, reason: null, planningAvailable: true });
    const observer = build("operator_required");
    expect(await observer.controller.options({ userId: "u2" }, scope)).toMatchObject({ viewerCanOperate: false, reason: "operator_required", planningAvailable: false });
    expect(observer.service.options).not.toHaveBeenCalled();
  });

  it("UT-103 prevents stale source options and reports source_changed", async () => {
    const current = build(null, "changed");
    expect(await current.controller.options(actor, scope)).toMatchObject({ viewerCanOperate: false, reason: "source_changed", startReason: "source_changed" });
    expect(current.service.options).not.toHaveBeenCalled();
  });

  it("maps an inaccessible work item to a safe task flow error", async () => {
    const current = build(null);
    current.authorization.requireRead.mockRejectedValue(new AssignedIssueError("work_unavailable"));
    await expect(current.controller.options(actor, scope)).rejects.toMatchObject({ reason: "task_unavailable" });
  });

  it("UT-163 keeps local gate and evidence reads inside the authenticated task scope", async () => {
    const current = build(null);
    current.service.gates = vi.fn(async () => ({ items: [{ gateId: "lint", attempt: 1, required: true, state: "passed", reason: null, manifestHash: "b".repeat(64), checkedCheckoutDigest: "c".repeat(64), exitCode: 0, startedAt: null, finishedAt: null }], summary: "passed", nextCursor: null }));
    await expect(current.controller.gates(actor, { ...scope, runId: "r1", limit: 20 })).resolves.toMatchObject({ summary: "passed", items: [{ gateId: "lint", state: "passed" }] });
    await expect(current.controller.evidence(actor, { ...scope, runId: "r1", evidenceId: "e1" })).resolves.toMatchObject({ id: "e1", safeContentHash: "a".repeat(64) });
    expect(current.authorization.requireRead).toHaveBeenCalledTimes(2);
  });
});
