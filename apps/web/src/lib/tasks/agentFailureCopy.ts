const GENERIC_PROVIDER = "agente";
const DETAIL_SEPARATOR = ": ";

const USAGE_LIMIT_REASONS = ["provider_usage_limit", "planning_rate_limited"];
const UNAVAILABLE_REASONS = ["local_agent_unavailable", "planning_local_agent_unavailable"];

export const AGENT_SETTINGS_INVALID_MESSAGE = "O modelo configurado para este agente não está mais disponível. Escolha outro nas Configurações do projeto.";
export const AGENT_SETTINGS_REASONS = ["agent_settings_invalid", "planning_agent_settings_invalid"];

function usageLimitMessage(detail?: string | null) {
  const provider = detail?.trim() || GENERIC_PROVIDER;
  return `A assinatura do ${provider} atingiu o limite de uso. Tente de novo mais tarde ou troque o provedor nas Configurações do projeto.`;
}

function unavailableMessage(detail?: string | null) {
  const separator = detail?.indexOf(DETAIL_SEPARATOR) ?? -1;
  if (!detail || separator < 0) return "O agente local não está disponível nesta máquina.";
  return `O ${detail.slice(0, separator)} não está disponível nesta máquina: ${detail.slice(separator + DETAIL_SEPARATOR.length)}.`;
}

export function agentFailureMessage(reason: string, detail?: string | null) {
  if (USAGE_LIMIT_REASONS.includes(reason)) return usageLimitMessage(detail);
  if (UNAVAILABLE_REASONS.includes(reason)) return unavailableMessage(detail);
  if (AGENT_SETTINGS_REASONS.includes(reason)) return AGENT_SETTINGS_INVALID_MESSAGE;
  return null;
}
