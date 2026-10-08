import { describe, expect, it, vi } from "vitest";
import type { CompozyControlGateway, LoopDefinition } from "../../software/compozyControlGateway";
import type { LoopFlowAction } from "./flowContracts";
import { LoopAdmissionService } from "./loopAdmissionService";

const TASK_ID = "2b775b8d-de72-46c7-9b9c-1976d7162dd1";
const DEFINITION: LoopDefinition = {
  name: "implement-tasks", version: "0", source: "marketplace", enabled: true, description: "Implement task files.",
  inputs: [{ name: "slug", kind: "string", required: true, hasDefault: false, enumValues: null }],
  runtimeRoles: ["default_runtime"], runtimeLocked: false, requires: [],
};
const RUNTIME = { connectionId: "c1", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null };
const localAction = (overrides: Partial<LoopFlowAction> = {}): LoopFlowAction => ({ kind: "loop", loopName: "implement-tasks", loopVersion: "0", inputs: { slug: TASK_ID }, runtimeBindings: { default_runtime: RUNTIME }, workspace: { kind: "local" }, ...overrides });

function admission(loops: LoopDefinition[] | undefined) {
  const gateway = { inspectLoop: vi.fn() } as unknown as CompozyControlGateway;
  const resolver = { resolve: vi.fn(async () => null) };
  const project = { key: "local:link", workspaceId: null, safeLabel: "Flow", target: { machineId: "m", linkId: "l", linkRevision: 1, checkoutHandle: "h" }, loops };
  const service = new LoopAdmissionService({ gateway, resolver, projectOf: async () => "project-1", localProjects: { inspect: async () => project } });
  return { service, gateway, resolver };
}

describe("loop admission on the linked local project", () => {
  it("validates a local Loop against the catalog reported by the machine without asking the host runtime", async () => {
    const { service, gateway, resolver } = admission([DEFINITION]);
    await expect(service.admit({ taskId: TASK_ID, action: localAction() })).resolves.toBeUndefined();
    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(gateway.inspectLoop).not.toHaveBeenCalled();
  });

  it("refuses a Loop the machine does not offer and one aimed at another task", async () => {
    await expect(admission([]).service.admit({ taskId: TASK_ID, action: localAction() })).rejects.toMatchObject({ reason: "loop_unavailable" });
    await expect(admission(undefined).service.admit({ taskId: TASK_ID, action: localAction() })).rejects.toMatchObject({ reason: "loop_unavailable" });
    await expect(admission([DEFINITION]).service.admit({ taskId: TASK_ID, action: localAction({ inputs: { slug: "other-task" } }) })).rejects.toMatchObject({ reason: "loop_input_invalid" });
    await expect(admission([DEFINITION]).service.admit({ taskId: TASK_ID, action: localAction({ loopVersion: "1" }) })).rejects.toMatchObject({ reason: "loop_version_changed" });
  });
});
