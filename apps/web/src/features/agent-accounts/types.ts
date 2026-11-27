import type { RouterOutputs } from "@flow-dev/api";

export type AgentAccount = RouterOutputs["agentAccounts"]["list"][number];
export type AgentAccountProvider = AgentAccount["provider"];
export type AgentAccountStatus = AgentAccount["status"];
