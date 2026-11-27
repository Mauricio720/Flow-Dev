import type { AgentAccountRecord, AgentAccountStatus, AgentAccountProvider } from "./agentAccountTypes";
import type { CodexStatus } from "../terminal/codexCatalog";

export class AgentAccountLabelTaken extends Error {
  constructor() {
    super("agent_account_label_taken");
    this.name = "AgentAccountLabelTaken";
  }
}

export type CreateAgentAccountInput = { ownerUserId: string; hostId: string; provider: AgentAccountProvider; label: string };
export type SaveAgentAccountCheckInput = { id: string; status: AgentAccountStatus; identity: string | null; plan: string | null; codexCatalog?: CodexStatus | null; checkedAt: Date };

export interface AgentAccountDao {
  insert(input: CreateAgentAccountInput): Promise<AgentAccountRecord>;
  listActive(input: { ownerUserId: string; hostId: string }): Promise<AgentAccountRecord[]>;
  listLoggedInCodex(hostId: string): Promise<AgentAccountRecord[]>;
  findById(id: string): Promise<AgentAccountRecord | null>;
  rename(input: { id: string; label: string; version: number }): Promise<AgentAccountRecord | null>;
  saveCheck(input: SaveAgentAccountCheckInput): Promise<AgentAccountRecord | null>;
  markRemoved(input: { id: string; at: Date }): Promise<void>;
  markRemovedIfIdle(input: { id: string; at: Date }): Promise<{ removed: boolean; openSessionCount: number }>;
  countOpenSessions(id: string): Promise<number>;
}
