export type LocalExecutionTarget = { machineId: string; linkId: string; linkRevision: number; checkoutHandle: string };
export type LocalRequiredGate = { id: string; label: string; commandDigest: string; kind: "command" | "playwright" };
export type LocalProjectInfo = { key: string; workspaceId: string | null; safeLabel: string; target: LocalExecutionTarget; loops?: import("../../software/compozyControlGateway").LoopDefinition[] };

export interface LocalProjectAccess {
  inspect(input: { taskId: string; projectId: string; actorId?: string }): Promise<LocalProjectInfo | null>;
  resolveTarget(input: { taskId: string; projectId: string; actorId: string }): Promise<LocalProjectInfo | null>;
  prepare(input: { taskId: string; projectId: string; actorId: string; actionId: string; sourceSnapshotId: string; action: import("./flowContracts").FlowAction; requestKey: string }): Promise<{ preparationId: string }>;
  preparationStatus(input: { actorId: string; projectId: string; preparationId: string }): Promise<{ preparationId: string; state: string; safeLabel: string; dirty: boolean | null; capabilities: string[]; manifestHash: string | null; checkoutDigest: string | null; requiredGates: LocalRequiredGate[]; reason: string | null; detail?: string | null } | null>;
  validatePreparation(input: { taskId: string; projectId: string; actorId: string; actionId: string; sourceSnapshotId: string; preparationId: string; action?: import("./flowContracts").FlowAction }): Promise<{ manifestHash: string; checkoutDigest: string; requiredGates: LocalRequiredGate[] } | null>;
}

export const isLocalWorkspaceKey = (value: string | null | undefined) => Boolean(value && /^local:[0-9a-f]{64}$/.test(value));
