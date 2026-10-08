import type { DraftAction, DraftRuntime, DraftWorkspace, FlowLoopOption, PlanActionInput } from "./unifiedContract";

type Provider = "codex" | "claude";
export type DraftContext = { providers: Map<string, Provider>; loops: FlowLoopOption[] };

const toRuntime = (runtime: DraftRuntime | null, providers: Map<string, Provider>) => {
  const providerId = runtime ? providers.get(runtime.connectionId) : undefined;
  return runtime && runtime.modelId && providerId ? { ...runtime, providerId } : null;
};

function toWorkspace(workspace: DraftWorkspace): PlanActionInput["workspace"] | null {
  if (workspace.kind === "unselected") return null;
  if (workspace.kind === "existing") return workspace.worktreeId ? workspace : null;
  if (workspace.kind === "new") return workspace.name.trim() ? { kind: "new", name: workspace.name.trim() } : null;
  return workspace;
}

function coerce(kind: string, value: string): string | number | boolean {
  if (kind === "number") return Number(value);
  if (kind === "boolean") return value === "true";
  return value;
}

function toLoopInputs(option: FlowLoopOption | undefined, raw: Record<string, string>) {
  const declared = new Map((option?.inputs ?? []).map((input) => [input.name, input.kind]));
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== "").map(([name, value]) => [name, coerce(declared.get(name) ?? "string", value)]));
}

export function draftToInput(action: DraftAction, context: DraftContext): PlanActionInput | null {
  const workspace = toWorkspace(action.workspace);
  if (!workspace) return null;
  if (action.kind !== "loop") {
    const runtime = toRuntime(action.runtime, context.providers);
    return runtime ? { kind: action.kind, language: action.language, runtime, workspace } : null;
  }
  const loop = action.loop;
  if (!loop) return null;
  const entries = Object.entries(loop.runtimes).map(([role, runtime]) => [role, toRuntime(runtime, context.providers)] as const);
  if (entries.some(([, runtime]) => runtime === null)) return null;
  const option = context.loops.find((candidate) => candidate.name === loop.name);
  return { kind: "loop", loopName: loop.name, loopVersion: loop.version, inputs: toLoopInputs(option, loop.inputs), runtimeBindings: Object.fromEntries(entries) as Record<string, never>, workspace };
}
