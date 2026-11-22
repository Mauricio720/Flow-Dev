import { DEFAULT_AGENT_CHOICE, isCatalogChoice } from "../../agents/agentCatalog";
import { AGENT_KINDS, type AgentChoice, type AgentKind } from "../../agents/agentTypes";
import type { StoredAgentSetting } from "../../database/dao/agentSettingsDao";

export type AgentSettingView = AgentChoice & { agent: AgentKind; version: number; isDefault: boolean; modelAvailable: boolean };

const NO_SAVED_VERSION = 0;

export function toView(agent: AgentKind, stored: StoredAgentSetting | null | undefined): AgentSettingView {
  if (!stored) return { ...DEFAULT_AGENT_CHOICE, agent, version: NO_SAVED_VERSION, isDefault: true, modelAvailable: true };
  const choice = { provider: stored.provider, model: stored.model, effort: stored.effort };
  return { ...choice, agent, version: stored.version, isDefault: false, modelAvailable: isCatalogChoice(choice) };
}

export function viewAll(stored: StoredAgentSetting[]) {
  return AGENT_KINDS.map((agent) => toView(agent, stored.find((item) => item.agent === agent)));
}
