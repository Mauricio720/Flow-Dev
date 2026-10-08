import type { ActionRecord, PlanRecord, RunRecord } from "../../database/dao/taskFlowDao";
import type { PackageFileRecord, PackageRecord } from "../../database/dao/unifiedPackageDao";
import type { ConnectionRecord } from "../../database/dao/softwareDao";
import { publicWorkspace } from "./localTargetBinding";

export type ConnectionLookup = Map<string, ConnectionRecord | null>;

export function bindingView(binding: ActionRecord["bindings"][number], connections: ConnectionLookup) {
  const connection = connections.get(binding.connectionId) ?? null;
  const available = !!connection && !connection.disabledAt && connection.authState === "connected";
  return { role: binding.role, connectionId: binding.connectionId, connectionLabel: connection?.label ?? null, providerId: binding.providerId, modelId: binding.modelId, reasoningEffort: binding.reasoningEffort, connectionAvailable: available };
}

export function planView(plan: PlanRecord, connections: ConnectionLookup) {
  const actions = plan.actions.map((action) => ({
    id: action.id, position: action.position, kind: action.kind, loopName: action.loopName, loopVersion: action.loopVersion,
    inputs: action.inputs, workspace: publicWorkspace(action.workspace), state: action.state,
    bindings: action.bindings.map((binding) => bindingView(binding, connections)),
  }));
  return { id: plan.id, revision: plan.revision, status: plan.status, actions };
}

type SnapshotChoice = { connectionId: string; providerId: string; modelId: string; reasoningEffort: string | null };

function snapshotChoices(snapshot: Record<string, unknown>): [string, SnapshotChoice][] {
  if (snapshot.kind === "loop") return Object.entries(snapshot.runtimeBindings as Record<string, SnapshotChoice>);
  return [["main", snapshot.runtime as SnapshotChoice]];
}

export function runView(run: RunRecord, connections: ConnectionLookup) {
  const labels = (run.snapshot.connectionLabels ?? {}) as Record<string, string>;
  const bindings = snapshotChoices(run.snapshot).map(([role, choice]) => {
    const current = connections.get(choice.connectionId);
    return { role, ...choice, connectionLabel: labels[choice.connectionId] ?? null, connectionAvailable: !!current && !current.disabledAt && current.authState === "connected" };
  });
  return {
    id: run.id, actionId: run.actionId, attemptNumber: run.attemptNumber, state: run.state, terminalCode: run.terminalCode,
    kind: run.snapshot.kind as string, loopName: (run.snapshot.loopName as string | undefined) ?? null, loopVersion: (run.snapshot.loopVersion as string | undefined) ?? null,
    worktreeId: run.worktreeId, workspaceKind: (run.snapshot.workspace as { kind?: string } | undefined)?.kind ?? "isolated", compozyVersion: run.snapshot.compozyVersion as string, createdAt: run.createdAt, finishedAt: run.finishedAt, bindings, activity: run.activity ?? null,
  };
}

export function packageView(record: PackageRecord, files: PackageFileRecord[]) {
  return {
    id: record.id, version: record.version, status: record.status, format: record.format, sourceRunId: record.sourceRunId,
    createdAt: record.createdAt, approvedAt: record.approvedAt,
    files: files.map((file) => ({ path: file.path, role: file.role, sha256: file.sha256, bytes: file.byteCount, required: file.required })),
  };
}
