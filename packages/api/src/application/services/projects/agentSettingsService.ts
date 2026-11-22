import type { SessionPrincipal } from "../../../context";
import { isCatalogChoice } from "../../agents/agentCatalog";
import type { AgentChoice, AgentKind } from "../../agents/agentTypes";
import type { AccessDao } from "../../database/dao/accessDao";
import type { AgentSettingsDao } from "../../database/dao/agentSettingsDao";
import type { ProjectDao } from "../../database/dao/projectDao";
import { ProjectAccessService } from "../access/projectAccessService";
import { AgentSettingsInvalidError, StaleAgentSettingsError } from "./agentSettingsErrors";
import { toView, viewAll } from "./agentSettingsView";

export type UpdateAgentSettingInput = AgentChoice & { projectId: string; agent: AgentKind; expectedVersion: number };
export type ResolvedAgent = { choice: AgentChoice; available: boolean };

export class AgentSettingsService {
  private readonly access: ProjectAccessService;
  constructor(private readonly settings: AgentSettingsDao, projects: ProjectDao, permissions: AccessDao) {
    this.access = new ProjectAccessService(projects, permissions);
  }

  async view(actor: SessionPrincipal, projectId: string) {
    await this.access.requireProject(actor, projectId);
    return viewAll(await this.settings.list(projectId));
  }

  async update(actor: SessionPrincipal, input: UpdateAgentSettingInput) {
    await this.access.requireAdmin(actor);
    const choice = { provider: input.provider, model: input.model, effort: input.effort };
    if (!isCatalogChoice(choice)) throw new AgentSettingsInvalidError();
    await this.access.requireProject(actor, input.projectId);
    const saved = await this.settings.save({ ...choice, projectId: input.projectId, agent: input.agent, expectedVersion: input.expectedVersion, updatedBy: actor.userId });
    if (!saved) throw new StaleAgentSettingsError();
    return toView(input.agent, saved);
  }

  async resolve(projectId: string, agent: AgentKind): Promise<ResolvedAgent> {
    const view = toView(agent, await this.settings.find(projectId, agent));
    return { choice: { provider: view.provider, model: view.model, effort: view.effort }, available: view.modelAvailable };
  }
}
