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
    expect(plan.work).toMatchObject({ identifier: "FD-MEU-APP-12-4f2a9c1e-impl", maxAttempts: 3, requiresApproval: false, metadata: { "flow_dev.task_id": directInput.taskId, "flow_dev.execution_id": "exec-id", "flow_dev.route": "direct_execution", "flow_dev.project": "MEU-APP" }, profile: { worker: { agentName: "code_implementer" }, review: { agentName: "reviewer" }, worktree: { mode: "per_run" } } });
  });
});
