import type { CodexStatus } from "../terminal/codexCatalog";

export type AgentAccountProvider = "claude" | "codex";
export type AgentAccountStatus = "pending_login" | "logged_in" | "logged_out" | "check_failed";

export type AgentAccountRecord = {
  id: string;
  ownerUserId: string;
  hostId: string;
  provider: AgentAccountProvider;
  label: string;
  status: AgentAccountStatus;
  identity: string | null;
  plan: string | null;
  codexCatalog: CodexStatus | null;
  checkedAt: Date | null;
  removedAt: Date | null;
  version: number;
  createdAt: Date;
};
