import type { AgentChoice, AgentKind } from "../../agents/agentTypes";

export type StoredAgentSetting = AgentChoice & {
  projectId: string;
  agent: AgentKind;
  version: number;
  updatedBy: string | null;
  updatedAt: Date;
};

export type SaveAgentSettingInput = AgentChoice & {
  projectId: string;
  agent: AgentKind;
  expectedVersion: number;
  updatedBy: string;
};

export interface AgentSettingsDao {
  list(projectId: string): Promise<StoredAgentSetting[]>;
  find(projectId: string, agent: AgentKind): Promise<StoredAgentSetting | null>;
  save(input: SaveAgentSettingInput): Promise<StoredAgentSetting | null>;
}
