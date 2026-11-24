import type { ExecutionPlanDao } from "../../database/dao/executionPlanDao";
import type { TaskSetReadDao } from "../../database/dao/taskSetReadDao";
import { DEFAULT_SESSION_CHOICE, agentAvailability, choiceProblem, modelUnavailableMessage, publishedAgentAvailability } from "../../terminal/sessionAgentCatalog";
import type { SessionAgent } from "../../terminal/sessionAgentCatalog";
import { ROUTE_PURPOSE } from "../../terminal/sessionPurposeInput";
import type { OpenPurpose, PreviewPurpose, PurposePreview, ResolvedPurpose } from "../../terminal/sessionPurposeInput";
import { TaskError } from "../tasks/taskErrors";
import type { PlanLog } from "../tasks-set/planLog";
import type { TaskSetLoader } from "../tasks-set/taskSetLoader";
import { executionPromptOf, loadItem, requireStartable } from "./purposePlanItem";
import { findSpec } from "./purposeSpecs";
import { buildGenerationPrompt } from "./taskPlanPrompts";
import type { SessionCatalogStatus } from "./sessionServiceStatus";

export type PurposeDeps = {
  specs: Pick<TaskSetReadDao, "specs">;
  loader: Pick<TaskSetLoader, "load">;
  plans: Pick<ExecutionPlanDao, "find" | "markForced">;
  agents: ReadonlySet<SessionAgent>;
  catalog?: SessionCatalogStatus;
  log: PlanLog;
  now: () => Date;
};

export class SessionPurposeResolver {
  constructor(private readonly deps: PurposeDeps) {}

  async preview(taskId: string, purpose: PreviewPurpose): Promise<PurposePreview> {
    const agents = await this.availability();
    if (purpose.kind === "route") return { prompt: null, choice: purpose.choice ?? DEFAULT_SESSION_CHOICE, agents };
    if (purpose.kind === "generate_tasks") {
      const spec = await findSpec(this.deps.specs, { taskId, specArtifactId: purpose.specArtifactId });
      return { prompt: buildGenerationPrompt(spec.path), choice: DEFAULT_SESSION_CHOICE, agents };
    }
    const loaded = await loadItem(this.deps, { taskId, planItemId: purpose.planItemId });
    requireStartable(loaded);
    return { prompt: executionPromptOf(loaded), choice: loaded.item.choice, agents };
  }

  async resolve(taskId: string, purpose: OpenPurpose = ROUTE_PURPOSE): Promise<ResolvedPurpose> {
    if (purpose.kind === "route") {
      const choice = purpose.choice ?? DEFAULT_SESSION_CHOICE;
      if (purpose.choice) await this.validateChoice(choice);
      return { columns: { purpose: "route", ...choice }, itemStart: null };
    }
    if (purpose.kind === "generate_tasks") return this.generation(taskId, purpose);
    return this.planItem(taskId, purpose);
  }

  async confirm(input: { resolved: ResolvedPurpose; actorId: string; sessionId: string }) {
    const { itemStart, columns } = input.resolved;
    if (!itemStart) return;
    const at = this.deps.now();
    await this.deps.plans.markForced({ itemId: itemStart.itemId, by: itemStart.force ? input.actorId : null, at: itemStart.force ? at : null });
    this.deps.log.itemStarted({ item: itemStart.itemId, session: input.sessionId, agent: columns.agent ?? null, model: columns.model ?? null, effort: columns.effort ?? null, force: itemStart.force });
  }

  private async generation(taskId: string, purpose: Extract<OpenPurpose, { kind: "generate_tasks" }>): Promise<ResolvedPurpose> {
    await findSpec(this.deps.specs, { taskId, specArtifactId: purpose.specArtifactId });
    await this.validateChoice(purpose.choice);
    return { columns: { purpose: "generate_tasks", ...purpose.choice }, itemStart: null };
  }

  private async planItem(taskId: string, purpose: Extract<OpenPurpose, { kind: "plan_item" }>): Promise<ResolvedPurpose> {
    const loaded = await loadItem(this.deps, { taskId, planItemId: purpose.planItemId });
    requireStartable(loaded);
    await this.validateChoice(loaded.item.choice);
    const blocked = loaded.readiness.blockedBy.length > 0;
    if (blocked && !purpose.force) throw new TaskError("plan_item_blocked");
    return { columns: { purpose: "plan_item", planItemId: loaded.item.id, ...loaded.item.choice }, itemStart: { itemId: loaded.item.id, force: blocked } };
  }

  private async availability() {
    if (!this.deps.catalog) return agentAvailability(this.deps.agents);
    const [running, status] = await Promise.all([this.deps.catalog.running(), this.deps.catalog.codexStatus()]);
    return publishedAgentAvailability(this.deps.agents, status, running);
  }

  private async validateChoice(choice: import("../../terminal/sessionAgentCatalog").AgentChoice) {
    const catalog = await this.deps.catalog?.codexStatus();
    if (choice.agent === "codex" && this.deps.catalog && !catalog) throw new TaskError("agent_unavailable", { message: "O catálogo do Codex ainda não foi publicado." });
    const problem = choiceProblem(choice, this.deps.agents, catalog);
    if (!problem) return;
    const message = problem === "model_unavailable" ? modelUnavailableMessage(choice.model) : choice.agent === "codex" ? catalog?.reason ?? undefined : undefined;
    throw new TaskError(problem, message ? { message } : undefined);
  }
}
