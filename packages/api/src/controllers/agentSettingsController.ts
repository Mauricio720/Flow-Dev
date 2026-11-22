import { TRPCError } from "@trpc/server";
import { AGENT_CATALOG } from "../application/agents/agentCatalog";
import type { AgentEffort, AgentKind, AgentProvider } from "../application/agents/agentTypes";
import { AgentSettingsInvalidError, StaleAgentSettingsError } from "../application/services/projects/agentSettingsErrors";
import type { AgentSettingsService } from "../application/services/projects/agentSettingsService";
import type { SessionPrincipal } from "../context";
import { mapProjectError } from "./projectsController";

export const AGENT_SETTINGS_INVALID_MESSAGE = "Escolha um modelo e um esforço disponíveis para este provedor.";
export const AGENT_SETTINGS_CONFLICT_MESSAGE = "A configuração mudou desde que você abriu a página. Recarregue para ver a versão atual.";

type UpdateInput = { projectId: string; agent: string; provider: string; model: string; effort: string; expectedVersion: number };

export class AgentSettingsController {
  constructor(private readonly service: AgentSettingsService) {}

  async get(actor: SessionPrincipal, projectId: string) {
    return { agents: await this.service.view(actor, projectId), catalog: AGENT_CATALOG };
  }

  async update(actor: SessionPrincipal, input: UpdateInput) {
    return this.service.update(actor, { ...input, agent: input.agent as AgentKind, provider: input.provider as AgentProvider, effort: input.effort as AgentEffort });
  }
}

export function mapAgentSettingsError(error: unknown): never {
  if (error instanceof AgentSettingsInvalidError) throw new TRPCError({ code: "BAD_REQUEST", message: AGENT_SETTINGS_INVALID_MESSAGE, cause: error });
  if (error instanceof StaleAgentSettingsError) throw new TRPCError({ code: "CONFLICT", message: AGENT_SETTINGS_CONFLICT_MESSAGE, cause: error });
  return mapProjectError(error);
}
