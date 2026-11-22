import { describe, expect, it, vi } from "vitest";
import type { AgentRun, LocalAgentRunner } from "../../application/agents/localAgentRunner";
import type { PlanningDispatch } from "../../application/services/tasks/planningContracts";
import { PLANNING_REQUEST_DEADLINE_MS } from "../../application/services/tasks/planningWorkerRules";
import { LocalPlanningGateway } from "./localPlanningGateway";

const EVIDENCE = "11111111-1111-4111-8111-111111111111";
const UNSEEN = "33333333-3333-4333-8333-333333333333";
const CAPABILITY = "p".repeat(40);

const dispatch: PlanningDispatch = {
  protocolVersion: 1, operationId: "op-1", executionId: "exec-1", taskId: "task-1", inputHash: "hash-1", issueUrl: "https://github.com/acme/shop/issues/42", contextCapability: CAPABILITY,
  publication: { attemptId: "attempt-1", repositoryId: "202", repositoryNodeId: "R_202", issueId: "I_42", issueNumber: 42, title: "Trocar texto do login", bodyMarkdown: "Trocar 'Entar' por 'Entrar'." },
};

function model(overrides: Record<string, unknown> = {}) {
  return { route: "DIRECT", complexity: "LOW", summary: "Mudança de texto simples.", reasons: [{ code: "CLEAR_SCOPE", label: "Escopo claro", description: "A Issue define o texto.", sourceIds: ["issue"] }], uncertainties: [], ...overrides };
}

function build(output: unknown, available = true, calls = [{ toolCallId: "c1", status: "done" as const, evidenceIds: [EVIDENCE], durationMs: 3 }]) {
  const runs: AgentRun[] = [];
  const runner: LocalAgentRunner = { run: vi.fn(async (request) => { runs.push(request); return { output, durationMs: 4, exitCode: 0 }; }) };
  const settings = { resolve: async () => ({ choice: { provider: "claude" as const, model: "sonnet", effort: "low" as const }, available }) } as never;
  const deps = { settings, runner, endpoint: { urlFor: (id: string) => `http://127.0.0.1:1/mcp/${id}` } as never, contextDao: { execution: async () => ({ projectId: "project-1" }), listCalls: async () => calls } as never, log: vi.fn() };
  return { gateway: new LocalPlanningGateway(deps), runs, runner };
}

describe("LocalPlanningGateway", () => {
  it("V-01c puts the title and body in the prompt and echoes the correlation ids", async () => {
    const { gateway, runs } = build(model());
    const envelope = await gateway.analyze(dispatch, new AbortController().signal);
    expect(envelope).toMatchObject({ protocolVersion: 1, operationId: "op-1", executionId: "exec-1", taskId: "task-1", inputHash: "hash-1", result: { recommendedRoute: "direct_execution", complexity: "low" } });
    expect(envelope.result.reasons[0]).toBe("Escopo claro — A Issue define o texto.");
    expect(runs[0]!.prompt).toContain("Trocar texto do login");
    expect(runs[0]!.prompt).toContain("Trocar 'Entar' por 'Entrar'.");
    expect(runs[0]!.prompt).toContain('"repository":"acme/shop"');
    expect(runs[0]!.timeoutMs).toBe(PLANNING_REQUEST_DEADLINE_MS);
    expect(runs[0]!.instructions).toContain("# Determine Spec Path");
    expect(runs[0]!.context).toEqual({ url: "http://127.0.0.1:1/mcp/exec-1", capability: CAPABILITY });
  });

  it("accepts a reason that cites evidence retrieved in this execution", async () => {
    const reasons = [{ code: "PATTERN", label: "Padrão existente", description: null, sourceIds: ["issue", EVIDENCE] }];
    const { gateway } = build(model({ route: "TECH_SPEC", reasons }));
    await expect(gateway.analyze(dispatch, new AbortController().signal)).resolves.toMatchObject({ result: { recommendedRoute: "tech_spec" } });
  });

  it("V-02a fails as planning_invalid_output when a reason cites an evidence id that was not consulted", async () => {
    const reasons = [{ code: "PATTERN", label: "Padrão", description: null, sourceIds: [UNSEEN] }];
    const { gateway } = build(model({ reasons }));
    await expect(gateway.analyze(dispatch, new AbortController().signal)).rejects.toMatchObject({ reason: "planning_invalid_output" });
  });

  it("V-02b fails as planning_invalid_output when DIRECT carries a blocking uncertainty", async () => {
    const { gateway } = build(model({ uncertainties: [{ question: "Qual texto exato?", blocking: true }] }));
    await expect(gateway.analyze(dispatch, new AbortController().signal)).rejects.toMatchObject({ reason: "planning_invalid_output" });
  });

  it("marks blocking uncertainties for a route that allows them", async () => {
    const { gateway } = build(model({ route: "PRD", uncertainties: [{ question: "Quem aprova?", blocking: true }, { question: "Há prazo?", blocking: false }] }));
    const envelope = await gateway.analyze(dispatch, new AbortController().signal);
    expect(envelope.result.uncertainties).toEqual(["Bloqueante: Quem aprova?", "Há prazo?"]);
  });

  it("V-07e fails with planning_agent_settings_invalid without calling the runner when the model left the catalog", async () => {
    const { gateway, runner } = build(model(), false);
    await expect(gateway.analyze(dispatch, new AbortController().signal)).rejects.toMatchObject({ reason: "planning_agent_settings_invalid" });
    expect(runner.run).not.toHaveBeenCalled();
  });

  it("rejects an output with an unknown property", async () => {
    const { gateway } = build(model({ nextStep: "EXECUTION" }));
    await expect(gateway.analyze(dispatch, new AbortController().signal)).rejects.toMatchObject({ reason: "planning_invalid_output" });
  });
});
