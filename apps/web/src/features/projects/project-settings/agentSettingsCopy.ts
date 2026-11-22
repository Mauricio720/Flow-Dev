import type { AgentSettingView } from "@/lib/projects/contract";

export const AGENTS_HEADING = "Agentes";
export const AGENTS_INTRO = "Cada agente roda com o Claude Code ou o Codex logado na máquina do worker, sem chave de API. Sem escolha salva, vale Claude Code, sonnet e esforço Baixo.";
export const AGENTS_READ_ONLY_NOTE = "Somente administradores escolhem o provedor, o modelo e o esforço dos agentes.";
export const MODEL_UNAVAILABLE_MESSAGE = "Modelo indisponível, escolha outro";
export const CONFLICT_MESSAGE = "A configuração mudou desde que você abriu a página. Recarregue para ver a versão atual.";
export const INVALID_MESSAGE = "Escolha um modelo e um esforço disponíveis para este provedor.";
export const FORBIDDEN_MESSAGE = "Sua conta não pode mais editar este projeto. Nada foi alterado.";
export const GENERIC_MESSAGE = "Não foi possível salvar agora. A escolha salva continua a mesma; tente de novo.";
export const DEFAULT_BADGE = "Padrão";

export const AGENT_LABEL: Record<AgentSettingView["agent"], string> = { issue_author: "Issue Author", planning: "Planejamento" };
export const AGENT_DESCRIPTION: Record<AgentSettingView["agent"], string> = {
  issue_author: "Conversa com a pessoa autora e escreve o rascunho da Issue.",
  planning: "Analisa a Issue publicada e recomenda a rota do planejamento.",
};
export const PROVIDER_LABEL: Record<string, string> = { claude: "Claude Code", codex: "Codex" };
export const EFFORT_LABEL: Record<AgentSettingView["effort"], string> = { low: "Baixo", medium: "Médio", high: "Alto" };
export const EFFORT_ORDER: AgentSettingView["effort"][] = ["low", "medium", "high"];

export function providerLabel(provider: string) {
  return PROVIDER_LABEL[provider] ?? provider;
}
