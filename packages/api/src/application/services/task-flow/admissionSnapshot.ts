import type { ActionSnapshot, FlowAction } from "./flowContracts";
import type { ValidatedChoice } from "./runtimeChoiceValidator";

export type SnapshotInput = {
  action: FlowAction;
  validated: Map<string, ValidatedChoice>;
  compozyVersion: string;
  worktreeId: string | null;
  localTarget?: import("./localProjectAccess").LocalExecutionTarget;
  localPreparation?: { preparationId: string; manifestHash: string; checkoutDigest: string; requiredGates: import("./localProjectAccess").LocalRequiredGate[] };
  source?: { snapshotId: string | null; operatorId: string };
};

export function buildSnapshot(input: SnapshotInput): ActionSnapshot {
  const connectionRevisions: Record<string, number> = {};
  const connectionLabels: Record<string, string> = {};
  const accountFingerprints: Record<string, string> = {};
  const runtimeProviderIds: Record<string, string> = {};
  for (const { connection } of input.validated.values()) {
    connectionRevisions[connection.id] = connection.revision;
    connectionLabels[connection.id] = connection.label;
    accountFingerprints[connection.id] = connection.accountFingerprint ?? "";
    runtimeProviderIds[connection.id] = connection.runtimeProviderId;
  }
  const action = input.action;
  const workspace = input.localTarget && action.workspace.kind === "local" ? { ...action.workspace, target: input.localTarget } : action.workspace;
  return { ...action, workspace, connectionRevisions, connectionLabels, accountFingerprints, runtimeProviderIds, compozyVersion: input.compozyVersion, worktreeId: input.worktreeId, sourceSnapshotId: input.source?.snapshotId ?? null, operatorId: input.source?.operatorId ?? null, ...(input.localPreparation ? { localPreparation: input.localPreparation } : {}) };
}
