import type { AgentAccountProvider, AgentAccountStatus } from "./agentAccountTypes";

export type TaskAgentAccountChoice = { provider: AgentAccountProvider; accountId: string; chosenBy: string | null; version: number; label: string; status: AgentAccountStatus; ownerUserId: string; removedAt: Date | null };

export interface TaskAgentAccountDao {
  projectIdOf(taskId: string): Promise<string | null>;
  choicesOf(taskId: string): Promise<TaskAgentAccountChoice[]>;
  set(input: { taskId: string; provider: AgentAccountProvider; accountId: string | null; chosenBy: string; version: number }): Promise<number | null>;
}
