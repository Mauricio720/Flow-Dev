import type { FlowConnection, FlowOptions, FlowOverview, FlowPackage, FlowRun, FlowRuns } from "@/features/issues/assigned-work/spec/unified/unifiedContract";

export const FLOW_TARGET = { projectId: "p1", taskId: "t1" };
const NOW = "2026-10-06T12:00:00.000Z";

export function connectionOf(overrides: Partial<FlowConnection> = {}): FlowConnection {
  return {
    id: "c1", label: "Codex principal", providerKind: "codex", executionTarget: "host", machineId: null, ready: true, reason: null,
    models: [
      { modelId: "gpt-5.6-sol", displayName: "gpt-5.6-sol", selectable: true, unselectableReason: null, reasoningChoices: [null, "low", "high"] },
      { modelId: "gpt-old", displayName: "gpt-old", selectable: false, unselectableReason: "catalog_stale", reasoningChoices: [] },
    ],
    ...overrides,
  };
}

export function optionsOf(overrides: Partial<FlowOptions> = {}): FlowOptions {
  return {
    taskId: "t1", flow: "none", planningAvailable: true, planningReason: null, startReason: null, localStartReason: null,
    actions: [{ kind: "create_spec", available: true }, { kind: "create_tasks", available: false }],
    connections: [connectionOf()], workspaces: [{ kind: "isolated" }], loops: [], loopsReason: null, worktrees: [], managedWorktreesAvailable: false, viewerCanOperate: true,
    ...overrides,
  } as FlowOptions;
}

export function packageOf(overrides: Partial<FlowPackage> = {}): FlowPackage {
  return {
    id: "k1", version: 1, status: "review_ready", format: "os_spec_v1", sourceRunId: "r1", createdAt: NOW, approvedAt: null,
    files: [{ path: "_spec.md", role: "spec", sha256: "a".repeat(64), bytes: 10, required: true }],
    ...overrides,
  };
}

export function overviewOf(overrides: Partial<FlowOverview> = {}): FlowOverview {
  return { flow: "unified", plan: null, legacy: null, activeRunId: null, packages: [], ...overrides } as FlowOverview;
}

export function planOf(state = "planned", reasoningEffort: string | null = "high"): NonNullable<FlowOverview["plan"]> {
  return {
    id: "plan1", revision: 1, status: "planned",
    actions: [{ id: "a1", position: 1, kind: "create_spec", loopName: null, loopVersion: null, inputs: { language: "pt-BR" }, workspace: { kind: "isolated" }, state, bindings: [{ role: "main", connectionId: "c1", connectionLabel: "Codex principal", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort, connectionAvailable: true }] }],
  } as NonNullable<FlowOverview["plan"]>;
}

export function runOf(overrides: Partial<FlowRun> = {}): FlowRun {
  return {
    id: "run1", actionId: "a1", attemptNumber: 1, state: "succeeded", terminalCode: null, kind: "create_spec", loopName: null, loopVersion: null,
    worktreeId: null, compozyVersion: "v0.3.0-beta.29", createdAt: NOW, finishedAt: null,
    bindings: [{ role: "main", connectionId: "c1", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high", connectionLabel: "Codex antigo", connectionAvailable: false }],
    ...overrides,
  } as FlowRun;
}

export const runsOf = (items: FlowRun[] = []): FlowRuns => ({ items, nextCursor: null });
