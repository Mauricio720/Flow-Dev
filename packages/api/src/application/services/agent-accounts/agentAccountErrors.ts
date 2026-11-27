export const ACCOUNT_NOT_FOUND_MESSAGE = "Conta de IA não encontrada.";

export type AgentAccountErrorReason = "label_invalid" | "label_taken" | "stale" | "not_found" | "has_open_sessions";

export class AgentAccountError extends Error {
  constructor(readonly reason: AgentAccountErrorReason, message: string, readonly openSessionCount?: number) {
    super(message);
    this.name = "AgentAccountError";
  }
}
