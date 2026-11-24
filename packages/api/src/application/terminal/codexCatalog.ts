import type { SessionModelOption } from "./sessionAgentCatalog";

export type CodexStatus = {
  available: boolean;
  reason: string | null;
  version: string | null;
  models: SessionModelOption[];
  refreshedAt: string;
};

export type PublishCodexStatusInput = { hostId: string; status: CodexStatus };
