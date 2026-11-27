import type { LocalCheckoutDao } from "../../database/dao/localCheckoutDao";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import { CLAUDE_BINARY, type ToolLocator } from "../../terminal/toolLocator";
import type { AgentChoice } from "../../terminal/sessionAgentCatalog";
import type { CodexCatalogProbe } from "../../terminal/codexCatalogProbe";
import { modelUnavailableMessage } from "../../terminal/sessionAgentCatalog";
import { CheckoutValidationError } from "../projects/localCheckoutErrors";
import type { LocalCheckoutService, VerifiedCheckout } from "../projects/localCheckoutService";
import { TaskError } from "../tasks/taskErrors";
import type { SessionServiceStatus } from "./sessionServiceStatus";
import type { TerminalLog } from "./terminalLaunchLog";
import { promptProblem } from "./terminalPromptBuilder";

export const TERMINAL_ENABLED_VARIABLE = "FLOW_DEV_TERMINAL_ENABLED";
const ENABLED_VALUE = "true";

export type TerminalGuardDeps = {
  env: NodeJS.ProcessEnv;
  checkouts: LocalCheckoutDao;
  verifier: Pick<LocalCheckoutService, "verify">;
  tools: ToolLocator;
  context: SessionContextBuilder;
  service: SessionServiceStatus;
  log: TerminalLog;
  codexProbe?: CodexCatalogProbe;
};

export class TerminalOpenGuard {
  constructor(private readonly deps: TerminalGuardDeps) {}

  assertEnabled() {
    if (this.deps.env[TERMINAL_ENABLED_VARIABLE] !== ENABLED_VALUE) throw new TaskError("terminal_disabled");
  }

  assertPrompt(prompt: string) {
    if (promptProblem(prompt)) throw new TaskError("prompt_invalid");
  }

  async requireCheckout(input: { userId: string; projectId: string; repository: string }): Promise<VerifiedCheckout> {
    const saved = await this.deps.checkouts.find(input.userId, input.projectId);
    if (!saved) throw new TaskError("checkout_missing");
    try {
      return await this.deps.verifier.verify(saved.path, input.repository);
    } catch (error) {
      if (error instanceof CheckoutValidationError) throw new TaskError("checkout_invalid", { repository: input.repository }, error);
      throw error;
    }
  }

  async readCheckout(input: { userId: string; projectId: string; repository: string }) {
    try {
      return await this.requireCheckout(input);
    } catch (error) {
      if (error instanceof TaskError && (error.reason === "checkout_missing" || error.reason === "checkout_invalid")) return null;
      throw error;
    }
  }

  async assertTools(choice: AgentChoice = { agent: "claude", model: "opus", effort: "max" }, taskId?: string) {
    if (choice.agent === "claude") {
      if (!(await this.deps.tools.has(CLAUDE_BINARY))) throw new TaskError("claude_unavailable");
      return;
    }
    const status = await this.deps.codexProbe?.read({ taskId });
    if (!status?.available) throw new TaskError("agent_unavailable", { message: status?.reason ?? "O catálogo do Codex não está disponível." });
    const model = status.models.find((item) => item.id === choice.model);
    if (!model) throw new TaskError("model_unavailable", { message: modelUnavailableMessage(choice.model) });
    if (!model.efforts.includes(choice.effort)) throw new TaskError("choice_invalid");
  }

  serviceRunning() {
    return this.deps.service.running();
  }

  async assertServiceRunning() {
    if (!(await this.serviceRunning())) throw new TaskError("session_service_offline");
  }

  async assertSkills() {
    const [missing] = await this.deps.context.missingSkills();
    if (!missing) return;
    this.deps.log.skillMissing({ skill: missing });
    throw new TaskError("skill_missing", { name: missing });
  }
}
