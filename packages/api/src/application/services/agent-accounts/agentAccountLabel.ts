import type { AgentAccountProvider } from "../../agent-accounts/agentAccountTypes";
import { AgentAccountError } from "./agentAccountErrors";

const MAX_LABEL_LENGTH = 40;

export function normalizeAgentAccountLabel(label: string) {
  const normalized = label.trim();
  if (normalized.length === 0) throw new AgentAccountError("label_invalid", "Informe um nome para a conta.");
  if (normalized.length > MAX_LABEL_LENGTH) throw new AgentAccountError("label_invalid", "O nome da conta pode ter até 40 caracteres.");
  return normalized;
}

export function duplicateLabelMessage(provider: AgentAccountProvider) {
  return `Você já tem uma conta do ${provider === "claude" ? "Claude Code" : "Codex"} com esse nome`;
}
