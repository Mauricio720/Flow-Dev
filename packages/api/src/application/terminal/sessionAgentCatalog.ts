import type { CodexStatus } from "./codexCatalog";

export const SESSION_AGENTS = ["claude", "codex"] as const;
export type SessionAgent = (typeof SESSION_AGENTS)[number];

export type AgentChoice = { agent: SessionAgent; model: string; effort: string };
export type SessionModelOption = { id: string; label: string; isDefault: boolean; efforts: string[]; defaultEffort: string | null };
export type AgentAvailability = { agent: SessionAgent; available: boolean; reason: string | null; models: string[]; efforts: string[]; modelOptions?: SessionModelOption[] };
export type ChoiceProblem = "choice_invalid" | "agent_unavailable" | "model_unavailable";
export const modelUnavailableMessage = (id: string) => `O modelo ${id} não está mais disponível no Codex. Troque o modelo da sessão.`;

const CLAUDE_MODELS = ["opus", "sonnet", "haiku"];
const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"];

const AGENT_OPTIONS: Record<SessionAgent, { models: string[]; efforts: string[] }> = {
  claude: { models: CLAUDE_MODELS, efforts: CLAUDE_EFFORTS },
  codex: { models: [], efforts: [] },
};

export const DEFAULT_SESSION_CHOICE: AgentChoice = { agent: "claude", model: "opus", effort: "max" };

export const AGENT_UNAVAILABLE_REASON: Record<SessionAgent, string> = {
  claude: "O Claude Code não está disponível nesta máquina.",
  codex: "O Codex ainda não conduz sessões no Flow Dev.",
};

export function agentAvailability(registered: ReadonlySet<SessionAgent>): AgentAvailability[] {
  return SESSION_AGENTS.map((agent) => {
    const available = registered.has(agent);
    return { agent, available, reason: available ? null : AGENT_UNAVAILABLE_REASON[agent], ...AGENT_OPTIONS[agent] };
  });
}

export function codexAgentAvailability(status: CodexStatus): AgentAvailability {
  const efforts = [...new Set(status.models.flatMap((model) => model.efforts))];
  return { agent: "codex", available: status.available, reason: status.reason, models: status.models.map((model) => model.id), efforts, modelOptions: status.models };
}

export function choiceProblem(choice: AgentChoice, registered: ReadonlySet<SessionAgent>, codex?: CodexStatus | null): ChoiceProblem | null {
  const options = AGENT_OPTIONS[choice.agent];
  if (!options) return "choice_invalid";
  if (!registered.has(choice.agent)) return "agent_unavailable";
  if (choice.agent === "codex" && codex) {
    if (!codex.available) return "agent_unavailable";
    const model = codex.models.find((option) => option.id === choice.model);
    if (!model) return "model_unavailable";
    return model.efforts.includes(choice.effort) ? null : "choice_invalid";
  }
  const known = options.models.includes(choice.model) && options.efforts.includes(choice.effort);
  return known ? null : "choice_invalid";
}

export function publishedAgentAvailability(registered: ReadonlySet<SessionAgent>, codex: CodexStatus | null, serviceRunning: boolean): AgentAvailability[] {
  const agents = agentAvailability(registered);
  const index = agents.findIndex((item) => item.agent === "codex");
  if (index < 0) return agents;
  agents[index] = codex ? codexAgentAvailability(codex) : { agent: "codex", available: false, reason: "O catálogo do Codex ainda não foi publicado.", models: [], efforts: [], modelOptions: [] };
  if (!registered.has("codex")) agents[index] = { ...agents[index]!, available: false, reason: AGENT_UNAVAILABLE_REASON.codex };
  if (!serviceRunning) agents[index] = { ...agents[index]!, available: false, reason: "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo." };
  return agents;
}

