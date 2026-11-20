import { describe, expect, it } from "vitest";
import { buildExecutionPlan } from "./executionPlan";

const directInput = {
  executionId: "exec-id", taskId: "4f2a9c1e-77d0-4b6e-9a3f-0e2d1c5b8a90", projectKey: "MEU-APP", defaultBranch: "main",
  issue: { title: "Implementar frete", url: "https://github.com/acme/meu-app/issues/12", number: 12, bodyMarkdown: "Critérios de aceite" },
  decision: { selectedRoute: "direct_execution" as const, summary: "Resumo", reasons: ["Motivo"], uncertainties: [] }, runtime: null,
};

describe("direct execution plan", () => {
  it("UT-012 builds one configured implementation task", () => {
    const plan = buildExecutionPlan(directInput);
    expect(plan).toMatchObject({ route: "direct_execution", branch: "flow-dev/MEU-APP-12-4f2a9c1e" });
    if (plan.route !== "direct_execution") throw new Error("Expected a direct execution plan");
    expect(plan.work).toMatchObject({ identifier: "FD-MEU-APP-12-4f2a9c1e-impl", maxAttempts: 3, requiresApproval: false, metadata: { "flow_dev.task_id": directInput.taskId, "flow_dev.execution_id": "exec-id", "flow_dev.route": "direct_execution", "flow_dev.project": "MEU-APP" }, profile: { worker: { agentName: "code_implementer" }, review: { agentName: "reviewer" }, worktree: { mode: "per_run" } } });
  });
});

describe("spec execution plan", () => {
  it("UT-011 builds the spec and approval-gated delivery tasks", () => {
    const plan = buildExecutionPlan({ ...directInput, decision: { ...directInput.decision, selectedRoute: "tech_spec" } });
    expect(plan).toMatchObject({ route: "tech_spec", branch: "flow-dev/MEU-APP-12-4f2a9c1e", specDir: ".compozy/tasks/fd-MEU-APP-12-4f2a9c1e", worktree: { name: "fd-MEU-APP-12-4f2a9c1e-spec", branch: "flow-dev/MEU-APP-12-4f2a9c1e-spec", baseRef: "main" } });
    if (plan.route === "direct_execution") throw new Error("Expected a spec plan");
    const spec = plan.createSpecTask("worktree-id");
    const delivery = plan.createDeliveryTask("/tmp/spec-worktree");
    expect(spec).toMatchObject({ identifier: "FD-MEU-APP-12-4f2a9c1e-spec", profile: { worker: { agentName: "general" }, review: { agentName: "reviewer" }, worktree: { mode: "ref", worktreeId: "worktree-id" }, runtime: null } });
    expect(delivery).toMatchObject({ identifier: "FD-MEU-APP-12-4f2a9c1e-delivery", requiresApproval: true, autoEnqueueOnReady: true, profile: { worker: { agentName: "spec_conductor" }, review: null, worktree: { mode: "none" }, runtime: null } });
    expect(delivery.description).toContain("/tmp/spec-worktree/.compozy/tasks/fd-MEU-APP-12-4f2a9c1e");
    expect(spec.description).toContain("Part II");
  });
});
