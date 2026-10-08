export type RuntimeChoice = { connectionId: string; providerId: string; modelId: string; reasoningEffort: string | null };

export type WorkspaceChoice = { kind: "isolated" } | { kind: "local"; target?: { machineId: string; linkId: string; linkRevision: number; checkoutHandle: string } } | { kind: "existing"; worktreeId: string } | { kind: "new"; name: string };

export type DocumentLanguage = "pt-BR" | "en";

export type SkillFlowAction = { kind: "create_spec" | "create_tasks"; language: DocumentLanguage; runtime: RuntimeChoice; workspace: WorkspaceChoice };

export type LoopFlowAction = {
  kind: "loop";
  loopName: string;
  loopVersion: string;
  inputs: Record<string, unknown>;
  runtimeBindings: Record<string, RuntimeChoice>;
  workspace: WorkspaceChoice;
};

export type FlowAction = SkillFlowAction | LoopFlowAction;

export type ActionSnapshot = FlowAction & {
  connectionRevisions: Record<string, number>;
  connectionLabels: Record<string, string>;
  accountFingerprints: Record<string, string>;
  runtimeProviderIds: Record<string, string>;
  compozyVersion: string;
  worktreeId: string | null;
  sourceSnapshotId?: string | null;
  operatorId?: string | null;
  localPreparation?: { preparationId: string; manifestHash: string; checkoutDigest: string; requiredGates: import("./localProjectAccess").LocalRequiredGate[] };
};

export const SKILL_ROLE = "main";
export const MAX_PLAN_ACTIONS = 12;
