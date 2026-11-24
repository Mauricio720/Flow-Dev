import type { AgentChoice, AgentOption, LaunchPurpose, OpenPurpose, PreviewPurpose } from "./terminalContract";

export const DEFAULT_CHOICE: AgentChoice = { agent: "claude", model: "opus", effort: "max" };
export const ROUTE_PURPOSE: LaunchPurpose = { kind: "route" };

export type PurposeKey = { kind: LaunchPurpose["kind"]; planItemId: string | null; specId: string | null; force: boolean; choice: AgentChoice | null };

export function purposeKeyOf(purpose: LaunchPurpose, specId: string | null, choice: AgentChoice | null = null): PurposeKey {
  const planItemId = purpose.kind === "plan_item" ? purpose.planItemId : null;
  return { kind: purpose.kind, planItemId, specId, force: purpose.kind === "plan_item" && purpose.force === true, choice: purpose.kind === "route" ? choice : null };
}

export function defaultSpecId(purpose: LaunchPurpose): string | null {
  return purpose.kind === "generate_tasks" ? (purpose.specs[0]?.artifactId ?? null) : null;
}

export function previewPurposeOf(key: PurposeKey): PreviewPurpose | undefined {
  if (key.kind === "route") return { kind: "route", ...(key.choice ? { choice: key.choice } : {}) };
  if (key.kind === "generate_tasks") return key.specId ? { kind: "generate_tasks", specArtifactId: key.specId } : { kind: "generate_tasks" };
  return key.kind === "plan_item" && key.planItemId ? { kind: "plan_item", planItemId: key.planItemId } : undefined;
}

export function openPurposeOf(key: PurposeKey, choice: AgentChoice): OpenPurpose | undefined {
  if (key.kind === "route") return { kind: "route", choice };
  if (key.kind === "generate_tasks" && key.specId) return { kind: "generate_tasks", specArtifactId: key.specId, choice };
  if (key.kind === "plan_item" && key.planItemId) return key.force ? { kind: "plan_item", planItemId: key.planItemId, force: true } : { kind: "plan_item", planItemId: key.planItemId };
  return undefined;
}

export function agentProblemOf(choice: AgentChoice | null, agents: AgentOption[]): string | null {
  if (!choice) return null;
  const agent = agents.find((candidate) => candidate.agent === choice.agent);
  return agent && !agent.available ? agent.reason : null;
}
